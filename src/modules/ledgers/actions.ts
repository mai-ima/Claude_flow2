"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { requireLedgerMember, setActiveLedger, clearActiveLedger } from "@/lib/ledger-access";
import { PLANS, canUse } from "@/lib/plans";
import { Currency, type PlanTier } from "@/lib/enums";
import { isEmailEnabled } from "@/lib/env";
import { createInvite, pendingInvitesFor, acceptInvite } from "./invites";

async function userTier(userId: string): Promise<PlanTier> {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  return (b?.tier ?? "FREE") as PlanTier;
}

export const switchLedger = authedAction(
  z.object({ ledgerId: z.string() }),
  async ({ ledgerId }, user) => {
    await requireLedgerMember(ledgerId, user.id);
    await setActiveLedger(ledgerId);
    revalidatePath("/", "layout");
    return { ledgerId };
  },
);

export const createPod = authedAction(
  z.object({ name: z.string().min(1, "名前を入力してください。").max(40) }),
  async ({ name }, user) => {
    // ファミリー共有は PLUS 以上の機能（サーバー側でも認可）
    if (!canUse(await userTier(user.id), "familySharing")) {
      throw new Error("PLAN_REQUIRED");
    }
    const ledger = await db.ledger.create({
      data: {
        name,
        type: "POD",
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await setActiveLedger(ledger.id);
    revalidatePath("/", "layout");
    return { id: ledger.id };
  },
);

export const updateLedgerSettings = authedAction(
  z.object({
    ledgerId: z.string(),
    name: z.string().min(1, "名前を入力してください。").max(40),
    currency: Currency,
  }),
  async ({ ledgerId, name, currency }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    await db.ledger.update({
      where: { id: ledgerId },
      data: { name: name.trim(), currency },
    });
    // 通貨は全画面の金額表示に影響するためレイアウト全体を再検証。
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

export const inviteMember = authedAction(
  z.object({
    ledgerId: z.string(),
    email: z.string().email("メールアドレスの形式が正しくありません。"),
    role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
  }),
  async ({ ledgerId, email, role }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");

    const normalized = email.trim().toLowerCase();
    const ledger = await db.ledger.findUnique({
      where: { id: ledgerId },
      select: { ownerId: true, name: true },
    });
    if (!ledger) throw new Error("NOT_FOUND");

    const existing = await db.ledgerMember.findFirst({
      where: { ledgerId, user: { email: normalized } },
    });
    if (existing) throw new Error("ALREADY_MEMBER");

    // 人数上限は帳簿オーナーのプランで判定する。招待した人や画面を開いた人の
    // tier で見ると、同じ帳簿なのに見る人によって上限が変わって食い違う。
    const max = PLANS[await userTier(ledger.ownerId)].maxMembers;
    const count = await db.ledgerMember.count({ where: { ledgerId } });
    const pending = await pendingInvitesFor(normalized);
    // 保留中の招待も席として数える。数えないと、招待を出しただけ上限を超える。
    if (count + (pending > 0 ? 0 : 1) > max) throw new Error("MEMBER_LIMIT");

    // 招待は必ずメールで送る。届けられない環境では、リンクだけ作っても
    // 相手に渡す手段が無い。
    if (!isEmailEnabled) throw new Error("EMAIL_DISABLED");

    const { sent } = await createInvite({
      ledgerId,
      ledgerName: ledger.name,
      email: normalized,
      role,
      invitedByUserId: user.id,
      invitedByName: user.name ?? user.email ?? "メンバー",
    });
    if (!sent) throw new Error("EMAIL_SEND_FAILED");

    revalidatePath("/settings");
    return { ok: true };
  },
);

/**
 * オーナーを別のメンバーへ譲る。
 *
 * オーナーの所在は Ledger.ownerId と LedgerMember.role の2箇所に書かれている。
 * どちらか一方だけ書き換えると権限判定と表示が食い違うため、必ず同じ
 * トランザクションで揃える。
 */
export const transferOwnership = authedAction(
  z.object({ ledgerId: z.string(), toUserId: z.string() }),
  async ({ ledgerId, toUserId }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    if (toUserId === user.id) throw new Error("SELF_FORBIDDEN");

    const ledger = await db.ledger.findUnique({ where: { id: ledgerId } });
    if (!ledger) throw new Error("NOT_FOUND");
    if (ledger.type === "PERSONAL") throw new Error("PERSONAL_LEDGER");

    const target = await db.ledgerMember.findUnique({
      where: { ledgerId_userId: { ledgerId, userId: toUserId } },
    });
    if (!target) throw new Error("NOT_A_MEMBER");

    await db.$transaction([
      db.ledger.update({ where: { id: ledgerId }, data: { ownerId: toUserId } }),
      db.ledgerMember.update({
        where: { ledgerId_userId: { ledgerId, userId: toUserId } },
        data: { role: "OWNER" },
      }),
      db.ledgerMember.update({
        where: { ledgerId_userId: { ledgerId, userId: user.id } },
        data: { role: "EDITOR" },
      }),
      db.notification.create({
        data: {
          userId: toUserId,
          ledgerId,
          type: "SYSTEM",
          title: "帳簿のオーナーになりました",
          body: `「${ledger.name}」のオーナーがあなたに移りました。`,
          href: "/settings",
        },
      }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

/**
 * 招待を受ける。
 * 判定（宛先の一致・メール確認・人数上限）は invites.ts 側で行う。
 */
export const acceptInviteAction = authedAction(
  z.object({ token: z.string().min(1) }),
  async ({ token }, user) => {
    const result = await acceptInvite(token, {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    });
    if (!result.ok) {
      throw new Error(
        result.reason === "EMAIL_MISMATCH"
          ? "INVITE_EMAIL_MISMATCH"
          : result.reason === "UNVERIFIED"
            ? "INVITE_UNVERIFIED"
            : result.reason === "MEMBER_LIMIT"
              ? "MEMBER_LIMIT"
              : "INVITE_NOT_FOUND",
      );
    }
    await setActiveLedger(result.ledgerId);
    revalidatePath("/", "layout");
    return { ledgerId: result.ledgerId, ledgerName: result.ledgerName };
  },
);

/** 保留中の招待を取り消す。リンクはその場で使えなくなる。 */
export const revokeInvite = authedAction(
  z.object({ ledgerId: z.string(), inviteId: z.string() }),
  async ({ ledgerId, inviteId }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    const invite = await db.ledgerInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.ledgerId !== ledgerId) throw new Error("NOT_FOUND");
    await db.ledgerInvite.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() },
    });
    revalidatePath("/settings");
    return { ok: true };
  },
);

/**
 * メンバーの役割を変える（編集できる ⇄ 閲覧のみ）。
 *
 * これまでは招待時にしか決められず、あとから変えるには一度外して招待し直す
 * しかなかった。オーナーの付け替えは移譲（transferOwnership）で行うため、
 * ここでは扱わない。
 */
export const updateMemberRole = authedAction(
  z.object({
    ledgerId: z.string(),
    userId: z.string(),
    role: z.enum(["EDITOR", "VIEWER"]),
  }),
  async ({ ledgerId, userId, role }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    const ledger = await db.ledger.findUnique({ where: { id: ledgerId } });
    if (!ledger) throw new Error("NOT_FOUND");
    if (ledger.type === "PERSONAL") throw new Error("PERSONAL_LEDGER");
    // 自分を閲覧のみに落とすと、誰も設定を変えられない帳簿ができあがる。
    if (userId === user.id) throw new Error("SELF_FORBIDDEN");

    const target = await db.ledgerMember.findUnique({
      where: { ledgerId_userId: { ledgerId, userId } },
    });
    if (!target) throw new Error("NOT_A_MEMBER");
    // オーナーの降格はここではしない（持ち主が居なくなる）。
    if (target.role === "OWNER" || ledger.ownerId === userId) {
      throw new Error("CANNOT_REMOVE_OWNER");
    }

    // 権限が変わったことは相手に伝える。黙って閲覧のみにされると、
    // 保存できない理由が分からないまま操作することになる。
    await db.$transaction([
      db.ledgerMember.update({
        where: { ledgerId_userId: { ledgerId, userId } },
        data: { role },
      }),
      db.notification.create({
        data: {
          userId,
          ledgerId,
          type: "SYSTEM",
          title: "帳簿での権限が変わりました",
          body:
            role === "EDITOR"
              ? `「${ledger.name}」で記録の追加・編集ができるようになりました。`
              : `「${ledger.name}」は閲覧のみになりました。記録の追加・編集はできません。`,
          href: "/settings",
        },
      }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

/**
 * 帳簿から自分が抜ける。
 * オーナーのまま抜けると帳簿の持ち主が居なくなるため、先に移譲を求める。
 */
export const leaveLedger = authedAction(
  z.object({ ledgerId: z.string() }),
  async ({ ledgerId }, user) => {
    const member = await requireLedgerMember(ledgerId, user.id);
    const ledger = await db.ledger.findUnique({ where: { id: ledgerId } });
    if (!ledger) throw new Error("NOT_FOUND");
    if (ledger.type === "PERSONAL") throw new Error("PERSONAL_LEDGER");

    if (ledger.ownerId === user.id || member.role === "OWNER") {
      const others = await db.ledgerMember.count({
        where: { ledgerId, userId: { not: user.id } },
      });
      throw new Error(others === 0 ? "LAST_MEMBER" : "OWNER_MUST_TRANSFER");
    }

    await db.ledgerMember.delete({
      where: { ledgerId_userId: { ledgerId, userId: user.id } },
    });
    // 抜けた帳簿を選択したままにしない。
    await clearActiveLedger();
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

/**
 * 帳簿ごと削除する。取引・サブスク・予算・目標が全て消える。
 * 取り違えを防ぐため、帳簿名の入力一致を要求する。
 */
export const deleteLedger = authedAction(
  z.object({ ledgerId: z.string(), confirmName: z.string() }),
  async ({ ledgerId, confirmName }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    const ledger = await db.ledger.findUnique({
      where: { id: ledgerId },
      include: { members: { select: { userId: true } } },
    });
    if (!ledger) throw new Error("NOT_FOUND");
    if (ledger.type === "PERSONAL") throw new Error("PERSONAL_LEDGER");
    if (confirmName.trim() !== ledger.name) throw new Error("NAME_MISMATCH");

    // 削除すると通知も一緒に消えるため、先に他メンバーへ知らせる…のではなく、
    // 消える帳簿に紐づかない形（ledgerId を持たせない）では通知できないため、
    // 削除前に個人帳簿宛てとして送る。
    const others = ledger.members.map((m) => m.userId).filter((id) => id !== user.id);
    if (others.length > 0) {
      const personals = await db.ledger.findMany({
        where: { ownerId: { in: others }, type: "PERSONAL" },
        select: { id: true, ownerId: true },
      });
      const personalByUser = new Map(personals.map((p) => [p.ownerId, p.id]));
      const drafts = others
        .map((userId) => {
          const target = personalByUser.get(userId);
          if (!target) return null;
          return {
            userId,
            ledgerId: target,
            type: "SYSTEM",
            title: "共有帳簿が削除されました",
            body: `「${ledger.name}」がオーナーによって削除されました。`,
            href: "/settings",
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);
      if (drafts.length > 0) await db.notification.createMany({ data: drafts });
    }

    await db.ledger.delete({ where: { id: ledgerId } });
    await clearActiveLedger();
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

export const removeMember = authedAction(
  z.object({ ledgerId: z.string(), userId: z.string() }),
  async ({ ledgerId, userId }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    const ledger = await db.ledger.findUnique({ where: { id: ledgerId } });
    if (ledger?.ownerId === userId) throw new Error("CANNOT_REMOVE_OWNER");
    await db.ledgerMember.delete({
      where: { ledgerId_userId: { ledgerId, userId } },
    });
    revalidatePath("/settings");
    return { ok: true };
  },
);
