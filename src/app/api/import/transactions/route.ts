import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { importTransactionsCsv } from "@/modules/transactions/import";
import { tierAtLeast } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import type { PlanTier } from "@/lib/enums";
import { API_MESSAGE } from "@/lib/api-messages";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: API_MESSAGE.UNAUTHORIZED }, { status: 401 });
  if (!tierAtLeast(user.tier as PlanTier, "PRO")) {
    return NextResponse.json({ message: "CSV インポートは PRO プランの機能です。" }, { status: 403 });
  }

  // 最大2MBのCSVを解析し大量の行を書き込むため、実行回数を制限する。
  const rl = await rateLimit(`import:${user.id}`, 6, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { message: API_MESSAGE.RATE_LIMITED },
      { status: 429 },
    );
  }

  const ledgerId = await getActiveLedgerId(user.id);
  try {
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
  } catch {
    return NextResponse.json({ message: API_MESSAGE.FORBIDDEN }, { status: 403 });
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
