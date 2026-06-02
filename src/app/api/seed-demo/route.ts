import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed-demo";
import { env } from "@/lib/env";

/**
 * デモデータ投入。公開DBに山田太郎のサンプルを作る（べき等）。
 * CRON_SECRET を設定した場合は ?token=... 一致を要求。未設定なら誰でも実行可（作るのは固定のデモのみ）。
 */
async function handle(req: Request) {
  // 本番では既定で無効。ALLOW_DEMO_SEED か CRON_SECRET 設定時のみ許可。
  if (env.NODE_ENV === "production" && !env.ALLOW_DEMO_SEED && !env.CRON_SECRET) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const token = env.CRON_SECRET;
  if (token) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await seedDemo();
    return NextResponse.json({
      ok: true,
      message: "デモ + 管理者データを投入しました。",
      ...result,
    });
  } catch (err) {
    console.error("[seed-demo]", err);
    return NextResponse.json({ ok: false, error: "投入に失敗しました。" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
