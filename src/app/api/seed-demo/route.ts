import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed-demo";
import { env } from "@/lib/env";

/**
 * デモデータ投入。公開DBに山田太郎のサンプルを作る（べき等）。
 *
 * DB に書き込む破壊的な操作のため:
 * - POST のみ受け付ける（GET はプリフェッチやクローラで発火しうる）
 * - 本番では鍵の設定を必須とし、未設定なら実行を拒否する（fail-closed）
 *
 * 鍵は SEED_DEMO_SECRET。未設定なら CRON_SECRET へフォールバックする
 * （用途ごとに分けられるようにしつつ、既存デプロイを壊さない）。
 */
async function handle(req: Request) {
  const token = env.SEED_DEMO_SECRET || env.CRON_SECRET;

  if (env.NODE_ENV === "production") {
    if (!env.ALLOW_DEMO_SEED) {
      return NextResponse.json({ error: "disabled" }, { status: 403 });
    }
    // 本番で鍵が無い状態は「誰でも投入できる」状態。開放せず止める。
    if (!token) {
      console.error("[seed-demo] SEED_DEMO_SECRET is not configured; refusing to run");
      return NextResponse.json({ error: "not configured" }, { status: 503 });
    }
  }

  if (token) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await seedDemo();
    return NextResponse.json({ ok: true, message: "デモデータを投入しました。", ...result });
  } catch (err) {
    console.error("[seed-demo]", err);
    return NextResponse.json({ ok: false, error: "投入に失敗しました。" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}

export const POST = handle;
