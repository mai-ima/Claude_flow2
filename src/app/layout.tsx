import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/seo";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// テーマ・スキン先行適用（フラッシュ防止）
const themeScript = `(function(){try{var e=document.documentElement;var p=localStorage.getItem('tsumiki-theme')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);e.classList.toggle('dark',d);var s=localStorage.getItem('tsumiki-skin');e.dataset.skin=(s==='apple'||s==='liquidglass')?s:'classic';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/*
          スクロール出現演出(.reveal)は opacity:0 から始まり、可視化は
          IntersectionObserver（= JS）で行う。JS が無効／読み込み前だと
          マーケティングページの本文が最後まで見えないため、
          JS 無効時は最初から表示させる。
        */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<style>.reveal{opacity:1!important;transform:none!important}</style>`,
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
