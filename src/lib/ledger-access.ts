import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { bootstrapUser } from "./auth";
import type { MemberRole } from "./enums";

const LEDGER_COOKIE = "tsumiki_ledger";

/**
 * 権限の強さ。数が大きいほど広い。
 * SELF_EDITOR は「追加はできるが、直せるのは自分の記録だけ」なので、
 * VIEWER と EDITOR の間に置く。
 */
const ROLE_RANK: Record<MemberRole, number> = {
  VIEWER: 0,
  SELF_EDITOR: 1,
  EDITOR: 2,
  OWNER: 3,
};

/**
 * メンバー表示に必要な User フィールドのみ。`include: { user: true }` は
 * passwordHash など機微情報までサーバーメモリに載せるため使わない。
 */
const memberUserSelect = { id: true, name: true, email: true, image: true } as const;

export async function listUserLedgers(userId: string) {
  return db.ledger.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: memberUserSelect } } },
      _count: { select: { subscriptions: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** メンバーシップ検証付きでアクティブ帳簿 ID を返す（リクエスト内メモ化）。 */
export const getActiveLedgerId = cache(async (userId: string): Promise<string> => {
  const store = await cookies();
  const cookieId = store.get(LEDGER_COOKIE)?.value;
  if (cookieId) {
    const member = await db.ledgerMember.findUnique({
      where: { ledgerId_userId: { ledgerId: cookieId, userId } },
    });
    if (member) return cookieId;
  }
  const personal = await db.ledger.findFirst({
    where: { ownerId: userId, type: "PERSONAL" },
    orderBy: { createdAt: "asc" },
  });
  if (personal) return personal.id;

  // フォールバック: 所属する最初の帳簿
  const any = await db.ledger.findFirst({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
  });
  if (any) return any.id;

  // 帳簿が1つも無いユーザー。
  // 以前はここで投げており、アプリの全ページが 500 になって復帰できなかった。
  // 個人帳簿は本来サインアップ時に作られるが、管理側での作成・データ移行・
  // 過去の不具合など、無い状態は現実に起こりうる。その場で用意して先へ進める。
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  await bootstrapUser(userId, user?.name ?? null);
  const created = await db.ledger.findFirst({
    where: { ownerId: userId, type: "PERSONAL" },
    orderBy: { createdAt: "asc" },
  });
  if (!created) throw new Error("NO_LEDGER");
  return created.id;
});

export async function setActiveLedger(ledgerId: string) {
  const store = await cookies();
  store.set(LEDGER_COOKIE, ledgerId, { path: "/", sameSite: "lax" });
}

/** 選択中の帳簿を解除する（退出・削除の直後に呼ぶ）。次回は個人帳簿へ戻る。 */
export async function clearActiveLedger() {
  const store = await cookies();
  store.delete(LEDGER_COOKIE);
}

/** 帳簿メンバーであることを検証。権限不足/非メンバーは FORBIDDEN。 */
export async function requireLedgerMember(
  ledgerId: string,
  userId: string,
  minRole: MemberRole = "VIEWER",
) {
  const member = await db.ledgerMember.findUnique({
    where: { ledgerId_userId: { ledgerId, userId } },
  });
  if (!member) throw new Error("FORBIDDEN");
  if (ROLE_RANK[member.role as MemberRole] < ROLE_RANK[minRole]) {
    throw new Error("FORBIDDEN");
  }
  return member;
}

/**
 * 既存の記録を直す／消す権限を検証する。
 *
 * EDITOR 以上は誰の記録でも触れる。SELF_EDITOR は自分が入れたものだけ。
 * 記録者が退会して createdByUserId が null になっている行は、
 * SELF_EDITOR からは触れない扱いにする。「誰のものでもない」を
 * 「自分のもの」に倒すと、権限を絞った意味が無くなる。
 *
 * 追加そのものは requireLedgerMember(..., "SELF_EDITOR") で足りる。
 */
export async function requireOwnRecordOrEditor(
  ledgerId: string,
  userId: string,
  createdByUserId: string | null,
) {
  const member = await requireLedgerMember(ledgerId, userId, "SELF_EDITOR");
  if (ROLE_RANK[member.role as MemberRole] >= ROLE_RANK.EDITOR) return member;
  if (createdByUserId && createdByUserId === userId) return member;
  throw new Error("NOT_YOUR_RECORD");
}

export const getActiveLedger = cache(async (userId: string) => {
  const id = await getActiveLedgerId(userId);
  const ledger = await db.ledger.findUnique({
    where: { id },
    include: { members: { include: { user: { select: memberUserSelect } } } },
  });
  if (!ledger) throw new Error("NO_LEDGER");
  const role =
    ledger.members.find((m) => m.userId === userId)?.role ?? "VIEWER";
  return { ledger, role: role as MemberRole };
});

/**
 * 指定のカテゴリ／支払い方法が、その帳簿のものであることを検証する。
 *
 * これらは画面から ID をそのまま受け取るため、他帳簿の ID を渡されると
 * 帳簿をまたいだ参照を作れてしまう（一覧には出ないが集計や表示で露出する）。
 * 呼び出し側で必ず通す。null / undefined は「未指定」として素通しする。
 */
export async function assertLedgerOwnedRefs(
  ledgerId: string,
  refs: {
    categoryId?: string | null;
    paymentMethodId?: string | null;
    /** 立て替えた人。その帳簿のメンバーでなければならない。 */
    paidByUserId?: string | null;
  },
): Promise<void> {
  const { categoryId, paymentMethodId, paidByUserId } = refs;
  const [cat, pm, member] = await Promise.all([
    categoryId
      ? db.category.findUnique({ where: { id: categoryId }, select: { ledgerId: true } })
      : Promise.resolve(null),
    paymentMethodId
      ? db.paymentMethod.findUnique({ where: { id: paymentMethodId }, select: { ledgerId: true } })
      : Promise.resolve(null),
    // 非メンバーを「払った人」にできると、精算の相手が帳簿の外に出てしまう。
    paidByUserId
      ? db.ledgerMember.findUnique({
          where: { ledgerId_userId: { ledgerId, userId: paidByUserId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (categoryId && cat?.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  if (paymentMethodId && pm?.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  if (paidByUserId && !member) throw new Error("NOT_A_MEMBER");
}
