import type { Metadata } from "next";
import { clientEnv } from "./env";

export const SITE = {
  name: "Tsumiki",
  nameJa: "ツミキ",
  tagline: "家計とサブスクを、ひとつに積み上げる。",
  description:
    "Tsumiki（ツミキ）は、家計簿とサブスク管理をひとつにまとめた家計アプリ。繰り返し取引や自動積立などの自動化、予算アラート、サブスクの値上げ検知まで、驚くほどなめらかで上質な体験で。",
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  locale: "ja_JP",
} as const;

/** アプリのバージョン表記（設定画面・リリースノート等で参照を一元化）。 */
export const APP_VERSION = "1.2.7.1";

/** 問い合わせ窓口（用途別）。各ページから参照し、メールの散在を防ぐ。 */
export const CONTACT = {
  support: "support@tsumiki.app",
  feedback: "feedback@tsumiki.app",
  privacy: "privacy@tsumiki.app",
} as const;

/**
 * 運営者・法務情報。ベータ期間中は実在の登記情報が未確定のため一部はプレースホルダ。
 * 本番公開前に専門家のレビューを受け、実際の事業者情報へ差し替えること。
 */
export const OPERATOR = {
  name: "Tsumiki 運営チーム",
  serviceName: "Tsumiki（ツミキ）",
  /** 個人運営の許容範囲として、所在地は請求時に遅滞なく開示する方針。 */
  addressDisclosure: "請求があった場合に遅滞なく開示します",
  governingLaw: "日本法",
  jurisdiction: "東京地方裁判所",
  /** サービス提供開始年（ベータ）。 */
  since: "2026年",
  contactEmail: CONTACT.support,
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
