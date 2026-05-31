import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { jsonLd, SITE } from "@/lib/seo";
import { PLAN_LIST } from "@/lib/plans";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
  });

  const appLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "ja",
    description: SITE.description,
    offers: PLAN_LIST.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.monthly,
      priceCurrency: "JPY",
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: appLd }} />
      <SiteHeader />
      <main className="min-h-screen">{children}</main>
      <SiteFooter />
    </>
  );
}
