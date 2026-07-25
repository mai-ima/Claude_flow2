import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveLedgerId } from "@/lib/ledger-access";
import { db } from "@/lib/db";
import { tierAtLeast } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import type { PlanTier } from "@/lib/enums";

/** CSV エクスポート（PRO 限定）。 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  if (!tierAtLeast(user.tier as PlanTier, "PRO")) {
    return NextResponse.json({ message: "CSV エクスポートは PRO プランの機能です。" }, { status: 403 });
  }

  // 帳簿の全取引を走査するため、連続実行を制限する。
  const rl = await rateLimit(`export:${user.id}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { message: "書き出しの回数が多すぎます。少し時間をおいてお試しください。" },
      { status: 429 },
    );
  }

  const ledgerId = await getActiveLedgerId(user.id);
  const txns = await db.transaction.findMany({
    where: { ledgerId },
    include: { category: true, paymentMethod: true },
    orderBy: { occurredAt: "desc" },
  });

  const header = ["日付", "種別", "金額", "通貨", "カテゴリ", "支払い方法", "メモ"];
  const rows = txns.map((t) => [
    t.occurredAt.toISOString().slice(0, 10),
    t.type === "INCOME" ? "収入" : "支出",
    String(t.amount),
    t.currency,
    t.category?.name ?? "",
    t.paymentMethod?.name ?? "",
    (t.memo ?? "").replace(/"/g, '""'),
  ]);

  const csv = [header, ...rows]
    .map((cols) => cols.map((c) => `"${c}"`).join(","))
    .join("\r\n");
  const bom = "﻿"; // Excel 向け BOM

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tsumiki-transactions.csv"`,
    },
  });
}
