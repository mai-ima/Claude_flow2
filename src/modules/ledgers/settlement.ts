/**
 * 共有帳簿の精算。
 *
 * 誰がいくら払い、本来いくら負担するはずで、差し引きいくらのやり取りが
 * 必要なのかを出す。判断はしない。数字と、その出どころだけを返す。
 *
 * 金額はすべて最小単位の整数（JPY=円）で扱う。割り切れない端数は
 * 捨てずに誰かに寄せる。捨てると合計が合わなくなり、
 * 「1円合わない」を利用者に説明できなくなる。
 */

export interface ShareMember {
  userId: string;
  /** 負担の重み。全員の合計に対する比で按分する。 */
  shareRatio: number;
}

export interface Share {
  userId: string;
  /** 本来の負担額。全員ぶんを足すと total にちょうど一致する。 */
  owed: number;
  /** 負担の割合（%）。表示用。 */
  percent: number;
}

/**
 * 総額を重みで按分する。
 *
 * 端数は「割り算の余りが大きい人」から1円ずつ配る（最大剰余方式）。
 * 均等割りで 1000 円を3人に分けると 333.33… になるが、
 * 333+333+333=999 では1円足りない。誰か1人が334円を負担する。
 * 誰が負担するかは userId 順で決めるので、同じ入力なら常に同じ結果になる。
 */
export function fairShares(total: number, members: ShareMember[]): Share[] {
  const valid = members.filter((m) => m.shareRatio > 0);
  // 全員の重みが0（あるいはメンバーがいない）なら按分できない。
  if (valid.length === 0) {
    return members.map((m) => ({ userId: m.userId, owed: 0, percent: 0 }));
  }

  const totalRatio = valid.reduce((s, m) => s + m.shareRatio, 0);
  const base = valid.map((m) => {
    const exact = (total * m.shareRatio) / totalRatio;
    const floor = Math.floor(exact);
    return { userId: m.userId, floor, remainder: exact - floor, ratio: m.shareRatio };
  });

  let left = total - base.reduce((s, b) => s + b.floor, 0);
  // 余りの大きい順。同点なら userId 順（結果を毎回同じにするため）。
  const order = [...base].sort(
    (a, b) => b.remainder - a.remainder || a.userId.localeCompare(b.userId),
  );
  const extra = new Map<string, number>();
  for (const b of order) {
    if (left <= 0) break;
    extra.set(b.userId, 1);
    left--;
  }

  const owedOf = new Map(
    base.map((b) => [b.userId, b.floor + (extra.get(b.userId) ?? 0)] as const),
  );
  const percentOf = new Map(base.map((b) => [b.userId, (b.ratio / totalRatio) * 100] as const));

  return members.map((m) => ({
    userId: m.userId,
    owed: owedOf.get(m.userId) ?? 0,
    percent: percentOf.get(m.userId) ?? 0,
  }));
}

export interface Balance {
  userId: string;
  /** 本来の負担額。 */
  owed: number;
  /** 実際に払った額（立て替えを含む）。 */
  paid: number;
  /** すでに精算で受け渡した額（受け取りがプラス）。 */
  settled: number;
  /**
   * 差引。
   * プラス = 払いすぎているので受け取る側。マイナス = 払う側。
   */
  net: number;
}

/**
 * 各メンバーの差引を出す。
 *
 * net = 払った額 − 本来の負担額 − すでに受け取った額。
 * 精算済みぶんを引かないと、精算するたびに同じ差額が残り続ける。
 */
export function balances(
  shares: Share[],
  paidBy: Map<string, number>,
  settledBy: Map<string, number> = new Map(),
): Balance[] {
  return shares.map((s) => {
    const paid = paidBy.get(s.userId) ?? 0;
    const settled = settledBy.get(s.userId) ?? 0;
    return { userId: s.userId, owed: s.owed, paid, settled, net: paid - s.owed - settled };
  });
}

export interface Transfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * 差引を解消する送金の組み合わせを出す。
 *
 * 一番多く払う人から、一番多く受け取る人へ順に充てていく。
 * 全員が全員に送るより回数が減り、実際にやり取りしやすい。
 * 最小回数であることは保証しないが、人数がひと桁の家計では十分に短くなる。
 */
export function minimalTransfers(rows: Balance[]): Transfer[] {
  // 元の配列を壊さない。呼び出し側が同じ配列を画面にも使う。
  const debtors = rows
    .filter((b) => b.net < 0)
    .map((b) => ({ userId: b.userId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));
  const creditors = rows
    .filter((b) => b.net > 0)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0) {
      out.push({ fromUserId: debtors[i].userId, toUserId: creditors[j].userId, amount });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return out;
}

/**
 * 精算の記録から、各メンバーの受け渡し済み額を集計する。
 *
 * 受け取った側がプラス、払った側がマイナス。balances の settled に渡す。
 */
export function settledAmounts(
  records: { fromUserId: string | null; toUserId: string | null; amount: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of records) {
    if (r.fromUserId) out.set(r.fromUserId, (out.get(r.fromUserId) ?? 0) - r.amount);
    if (r.toUserId) out.set(r.toUserId, (out.get(r.toUserId) ?? 0) + r.amount);
  }
  return out;
}
