import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/transactions",
        "/subscriptions",
        "/budgets",
        "/reports",
        "/settings",
        "/billing",
        "/api/",
        "/login",
        "/signup",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
