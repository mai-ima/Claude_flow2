import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { clientEnv } from "@/lib/env";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { PLANS } from "@/lib/plans";

/**
 * 帳簿への招待。
 *
 * これまでは登録済みユーザーしか招待できず、「先に登録してもらってから
 * もう一度招待する」という手順を相手に強いていた。
 * メールアドレス宛にリンクを送り、登録の前後どちらでも受け取れるようにする。
 */

/** 招待リンクの有効期限。長すぎると、退職者の手元に残った URL が生き続ける。 */
const INVITE_TTL_DAYS = 7;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function inviteUrl(rawToken: string): string {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/invite/${encodeURIComponent(rawToken)}`;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt: Date;
}

/** 保留中の招待（未受諾・未取消・期限内）。 */
export async function listPendingInvites(ledgerId: string): Promise<PendingInvite[]> {
  const rows = await db.ledgerInvite.findMany({
    where: {
      ledgerId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }));
}

/**
 * 招待を作ってメールを送る。
 * 同じ宛先に保留中の招待があれば作り直す（古いリンクは無効になる）。
 */
export async function createInvite(input: {
  ledgerId: string;
  ledgerName: string;
  email: string;
  role: "EDITOR" | "VIEWER";
  invitedByUserId: string;
  invitedByName: string;
}): Promise<{ id: string; sent: boolean; url: string }> {
  const email = input.email.trim().toLowerCase();

  // 同じ宛先の保留分は畳む。リンクが何本も生きている状態を作らない。
  await db.ledgerInvite.updateMany({
    where: { ledgerId: input.ledgerId, email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const raw = randomBytes(32).toString("base64url");
  const invite = await db.ledgerInvite.create({
    data: {
      ledgerId: input.ledgerId,
      email,
      role: input.role,
      token: hashToken(raw),
      invitedByUserId: input.invitedByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const url = inviteUrl(raw);
  const { sent } = await sendEmail({
    to: email,
    subject: `【Tsumiki】「${input.ledgerName}」への招待`,
    kind: "BROADCAST",
    html: emailLayout(
      "家計簿に招待されています",
      `<p>${escapeHtml(input.invitedByName)} さんから、共有の家計簿
       「${escapeHtml(input.ledgerName)}」に招待されています。</p>
       <p style="margin:20px 0">
         <a href="${escapeHtml(url)}" style="display:inline-block;background:#0b6cf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">招待を受ける</a>
       </p>
       <p style="font-size:13px;color:#8e8e93">このリンクは${INVITE_TTL_DAYS}日間有効です。
       Tsumiki のアカウントをお持ちでない場合は、登録するとそのまま参加できます。<br>
       お心当たりが無い場合は、このメールを破棄してください。</p>`,
    ),
  });

  return { id: invite.id, sent, url };
}

export type InviteLookup =
  | { ok: true; invite: { id: string; email: string; role: string; ledgerId: string; ledgerName: string } }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "USED" | "REVOKED" };

/** リンクの中身を確かめる。受諾はしない（画面表示用）。 */
export async function lookupInvite(rawToken: string): Promise<InviteLookup> {
  if (!rawToken) return { ok: false, reason: "NOT_FOUND" };
  const row = await db.ledgerInvite.findUnique({
    where: { token: hashToken(rawToken) },
    include: { ledger: { select: { name: true } } },
  });
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (row.revokedAt) return { ok: false, reason: "REVOKED" };
  if (row.acceptedAt) return { ok: false, reason: "USED" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };
  return {
    ok: true,
    invite: {
      id: row.id,
      email: row.email,
      role: row.role,
      ledgerId: row.ledgerId,
      ledgerName: row.ledger.name,
    },
  };
}

export type AcceptResult =
  | { ok: true; ledgerId: string; ledgerName: string }
  | {
      ok: false;
      reason: "NOT_FOUND" | "EXPIRED" | "USED" | "REVOKED" | "EMAIL_MISMATCH" | "UNVERIFIED" | "MEMBER_LIMIT";
    };

/**
 * 招待を受ける。
 *
 * 受け取れるのは、招待されたアドレス本人だけ。リンクを転送されても
 * 別のアカウントでは入れない（帳簿には家計の全履歴が入っている）。
 * メールアドレスの確認も必須にする。確認していないアドレスで名乗れると、
 * 他人のアドレスで登録した人が招待を横取りできてしまう。
 */
export async function acceptInvite(
  rawToken: string,
  user: { id: string; email: string | null; emailVerified: boolean },
): Promise<AcceptResult> {
  const found = await lookupInvite(rawToken);
  if (!found.ok) return found;

  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== found.invite.email) return { ok: false, reason: "EMAIL_MISMATCH" };
  if (!user.emailVerified) return { ok: false, reason: "UNVERIFIED" };

  const ledger = await db.ledger.findUnique({
    where: { id: found.invite.ledgerId },
    select: { ownerId: true, name: true },
  });
  if (!ledger) return { ok: false, reason: "NOT_FOUND" };

  const already = await db.ledgerMember.findUnique({
    where: { ledgerId_userId: { ledgerId: found.invite.ledgerId, userId: user.id } },
  });

  if (!already) {
    // 人数上限は帳簿オーナーのプランで見る（招待した人や受ける人ではない）。
    const billing = await db.billingProfile.findUnique({ where: { userId: ledger.ownerId } });
    const max = PLANS[(billing?.tier ?? "FREE") as keyof typeof PLANS].maxMembers;
    const count = await db.ledgerMember.count({ where: { ledgerId: found.invite.ledgerId } });
    if (count >= max) return { ok: false, reason: "MEMBER_LIMIT" };
  }

  await db.$transaction([
    db.ledgerMember.upsert({
      where: { ledgerId_userId: { ledgerId: found.invite.ledgerId, userId: user.id } },
      create: {
        ledgerId: found.invite.ledgerId,
        userId: user.id,
        role: found.invite.role,
      },
      update: { role: found.invite.role },
    }),
    db.ledgerInvite.update({
      where: { id: found.invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return { ok: true, ledgerId: found.invite.ledgerId, ledgerName: ledger.name };
}

/**
 * 登録直後に、そのアドレス宛の保留中の招待があるか調べる。
 * 「招待 → 登録 → 自動で参加」を成立させるために使う。
 */
export async function pendingInvitesFor(email: string): Promise<number> {
  return db.ledgerInvite.count({
    where: {
      email: email.trim().toLowerCase(),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}
