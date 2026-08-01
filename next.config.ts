import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy。
 *
 * script-src に 'unsafe-inline' を残しているのは意図的なトレードオフ:
 * テーマのちらつき防止スクリプト(src/lib/theme.ts)と JSON-LD(構造化データ)が
 * インライン <script> のため。nonce 方式にすると root layout が動的描画になり、
 * マーケティングページの静的生成(SSG/SEO)を失う。
 * 代わりに object-src/base-uri/form-action/frame-ancestors を締め、
 * タグ注入・base 乗っ取り・フォーム外部送信・クリックジャッキングは塞ぐ。
 *
 * 開発時は HMR(eval・websocket)が必要なため緩める。
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  isProd
    ? "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  isProd
    ? "connect-src 'self' https://pagead2.googlesyndication.com"
    : "connect-src 'self' ws: wss:",
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

/**
 * Prisma の生成クライアントはエンジンをパス解決で読み込むため、
 * ビルド時のファイルトレースがプロジェクト全体を巻き込み、
 * サーバー関数に開発用の依存まで同梱されてしまう（起動が遅くなる）。
 * 実行時に不要なものを明示的に外す。
 *
 * ここに書いてよいのは「実行時に絶対に読まれない」ものだけ。
 * 判断を誤ると、サーバー関数がリクエストを受ける前に
 * Cannot find module で落ち、動的なページが全滅する。
 * 静的なページは CDN から配信され続けるため、
 * 「トップは出るのにログインだけ落ちる」という分かりにくい形になる。
 *
 * 実際にそれで本番が停止した: @swc/** を外していたが、Next 自身が起動時に
 * @swc/helpers を require するため、関数が起動できなかった。
 * 手元の next start は node_modules が丸ごとあるので再現しない。
 * 迷ったら外さない。削れる容量より、止まる損失のほうがはるかに大きい。
 *
 * 追加・変更したら next-config.test.ts が実行時必須パッケージとの
 * 突き合わせを行う。
 */
export const TRACING_EXCLUDES = [
  "node_modules/.cache/**",
  "node_modules/typescript/**",
  "node_modules/prettier/**",
  "node_modules/eslint/**",
  "node_modules/eslint-*/**",
  "node_modules/@eslint/**",
  "node_modules/@typescript-eslint/**",
  "node_modules/vitest/**",
  "node_modules/@vitest/**",
  "node_modules/playwright/**",
  "node_modules/playwright-core/**",
  // Prisma の CLI と、エンジンの取得だけを担うパッケージ。
  // 実行時に読むエンジンは src/generated/prisma 配下にあり、これには当たらない。
  "node_modules/prisma/**",
  "node_modules/@prisma/engines/**",
  "public/**",
  "scripts/**",
  "**/*.test.ts",
  "**/*.test.tsx",
];

/**
 * サーバー関数が起動するために必ず要るパッケージ。
 * 除外リストがこれらに当たっていないことをテストで検査する。
 */
export const RUNTIME_REQUIRED_PACKAGES = [
  // Next 自身が setup-node-env から辿って require する。
  "@swc/helpers",
  "next",
  "react",
  "react-dom",
  "scheduler",
  "styled-jsx",
  "@prisma/client",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 画像の最適化を使わない。next/image はどこからも使っておらず、
  // 画像は public 配下の SVG と PNG を直接配信している。
  // 有効なままだと /_next/image が sharp(libvips) を呼ぶ経路として残る。
  // 使わない機能の分だけ攻撃対象を持つ理由が無いので閉じる。
  images: { unoptimized: true },
  outputFileTracingExcludes: { "**/*": TRACING_EXCLUDES },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
