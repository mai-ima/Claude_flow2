import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { importTransactionsCsv } from "@/modules/transactions/import";
import { tierAtLeast } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  if (!tierAtLeast(user.tier as PlanTier, "PRO")) {
    return NextResponse.json({ message: "CSV インポートは PRO プランの機能です。" }, { status: 403 });
  }

  const ledgerId = await getActiveLedgerId(user.id);
  try {
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
  } catch {
    return NextResponse.json({ message: "編集権限がありません。" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ message: "CSV が空です。" }, { status: 400 });
  }
  if (csv.length > 2_000_000) {
    return NextResponse.json({ message: "ファイルが大きすぎます。" }, { status: 413 });
  }

  const result = await importTransactionsCsv(ledgerId, user.id, csv);
  return NextResponse.json({ ok: true, ...result });
}
