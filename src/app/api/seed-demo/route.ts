import { NextResponse } from "next/server";
import { seedDemo, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/seed-demo";
import { env } from "@/lib/env";

/**
 * デモデータ投入。公開DBに山田太郎のサンプルを作る（べき等）。
 * CRON_SECRET を設定した場合は ?token=... 一致を要求。未設定なら誰でも実行可（作るのは固定のデモのみ）。
 */
async function handle(req: Request) {
  const token = env.CRON_SECRET;
  if (token) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    await seedDemo();
    return NextResponse.json({
      ok: true,
      message: "デモデータを投入しました。",
      login: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
  } catch (err) {
    console.error("[seed-demo]", err);
    return NextResponse.json({ ok: false, error: "投入に失敗しました。" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
