import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/features",
    "/pricing",
    "/about",
    "/faq",
    "/changelog",
    "/help",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/tokushoho",
    "/legal/security",
    "/legal/cookies",
  ];
  // デプロイのたびに now を入れると、内容が変わっていなくても
  // 全ページが「更新された」とクローラへ伝わる。内容を実際に更新したときに
  // ここを手で進める。
  const contentUpdatedAt = new Date("2026-07-26T00:00:00+09:00");
  return routes.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: contentUpdatedAt,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/pricing" ? 0.9 : 0.6,
  }));
}
