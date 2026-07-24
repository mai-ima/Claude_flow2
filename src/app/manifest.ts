import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE.name} — 家計簿 + サブスク管理`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f7",
    theme_color: "#007aff",
    lang: "ja",
    dir: "ltr",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "家計簿を開く", short_name: "家計簿", url: "/transactions" },
      { name: "カレンダーで見る", short_name: "カレンダー", url: "/transactions?view=calendar" },
      { name: "分析を見る", short_name: "分析", url: "/reports" },
      { name: "サブスクを見る", short_name: "サブスク", url: "/subscriptions" },
    ],
  };
}
