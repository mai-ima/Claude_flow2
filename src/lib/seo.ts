import type { Metadata } from "next";
import { clientEnv } from "./env";

export const SITE = {
  name: "Tsumiki",
  nameJa: "ツミキ",
  tagline: "家計とサブスクを、ひとつに積み上げる。",
  description:
    "Tsumiki（ツミキ）は、家計簿とサブスク管理をひとつにまとめた家計アプリ。収支記録・予算・更新リマインダー・無駄なサブスクの発見まで、Apple のように洗練された体験で。",
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  locale: "ja_JP",
} as const;

export function pageMetadata({
  title,
  description,
  path = "/",
  noindex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}): Metadata {
  const url = `${SITE.url}${path}`;
  const desc = description ?? SITE.description;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: title ?? `${SITE.name} — ${SITE.tagline}`,
      description: desc,
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? `${SITE.name} — ${SITE.tagline}`,
      description: desc,
    },
  };
}

/** JSON-LD を文字列で返す（<script type="application/ld+json"> に流し込む）。 */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
