import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/pricing", "/changelog", "/help", "/contact", "/legal/privacy", "/legal/terms", "/legal/tokushoho"];
  const now = new Date();
  return routes.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/pricing" ? 0.9 : 0.6,
  }));
}
