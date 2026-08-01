import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma の設定。
 *
 * package.json の "prisma" キーは Prisma 7 で削除されるため、こちらへ移した。
 *
 * このファイルを置くと Prisma CLI は .env の自動読み込みをやめる。
 * ローカルでは .env の DATABASE_URL を使うので自分で読み込む。
 * override: false にしてあるため、Vercel のように環境変数が既に入っている
 * 場所では上書きしない。
 */
loadEnv({ override: false });

// schema.prisma の directUrl（マイグレーション用の直結アドレス）。
// プールを挟まない環境では通常の接続文字列と同じでよいので、
// 未設定なら写しておく。無いと prisma のコマンドが起動時に落ちる。
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "node scripts/seed.mjs",
  },
});
