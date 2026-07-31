/**
 * データベース接続文字列の解決。
 *
 * Vercel の Postgres / Neon / Supabase 連携は、接続文字列を DATABASE_URL では
 * なく POSTGRES_PRISMA_URL などの別名で発行する。デプロイ用のビルドスクリプトは
 * 以前からこの別名を見ていたが、実行時のアプリは DATABASE_URL しか見ていなかった。
 * その結果「ビルドとマイグレーションは成功するのに、公開されたサイトだけ
 * データベースに繋がらない」という食い違いが起きる。解決をここに一本化する。
 *
 * scripts/vercel-build.mjs はビルドより前（TypeScript を読めない段階）で動くため
 * 同じ一覧を自前で持つ。database-url.test.ts が両者のずれを検出する。
 */

/** DATABASE_URL の次に見る環境変数名。優先度順。 */
export const FALLBACK_DATABASE_URL_KEYS = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NO_SSL",
  "NEON_DATABASE_URL",
  "SUPABASE_DB_URL",
] as const;

export interface ResolvedDatabaseUrl {
  url: string | undefined;
  /** どの環境変数から採ったか。調査用で、値そのものは含めない。 */
  source: string | null;
}

/**
 * 接続文字列と、その出どころの変数名を返す。
 * 環境変数はブラウザには渡らないため、クライアントでは常に未解決になる。
 */
export function resolveDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
): ResolvedDatabaseUrl {
  if (source.DATABASE_URL) return { url: source.DATABASE_URL, source: "DATABASE_URL" };
  for (const key of FALLBACK_DATABASE_URL_KEYS) {
    const value = source[key];
    if (value) return { url: value, source: key };
  }
  return { url: undefined, source: null };
}
