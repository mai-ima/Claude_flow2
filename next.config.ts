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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
