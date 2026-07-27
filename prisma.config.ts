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

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "node scripts/seed.mjs",
  },
});
