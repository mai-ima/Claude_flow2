import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import type { MemberRole } from "./enums";

const LEDGER_COOKIE = "tsumiki_ledger";

const ROLE_RANK: Record<MemberRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

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
  if (!any) throw new Error("NO_LEDGER");
  return any.id;
});

export async function setActiveLedger(ledgerId: string) {
  const store = await cookies();
  store.set(LEDGER_COOKIE, ledgerId, { path: "/", sameSite: "lax" });
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
  refs: { categoryId?: string | null; paymentMethodId?: string | null },
): Promise<void> {
  const { categoryId, paymentMethodId } = refs;
  const [cat, pm] = await Promise.all([
    categoryId
      ? db.category.findUnique({ where: { id: categoryId }, select: { ledgerId: true } })
      : Promise.resolve(null),
    paymentMethodId
      ? db.paymentMethod.findUnique({ where: { id: paymentMethodId }, select: { ledgerId: true } })
      : Promise.resolve(null),
  ]);
  if (categoryId && cat?.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  if (paymentMethodId && pm?.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
}
