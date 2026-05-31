import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — 家計簿 + サブスク管理`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#007aff",
    lang: "ja",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
