import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PlanComparison } from "@/components/marketing/plan-comparison";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { isStripeEnabled } from "@/lib/env";

export const metadata: Metadata = pageMetadata({
  title: "料金プラン",
  description:
    "Tsumiki の料金プラン。フリーは¥0から。サブスク無制限・予算管理のプラス（月¥480）、サブスク・レビューやファミリー共有のプロ（月¥980）。",
  path: "/pricing",
});

const FAQ = [
  {
    q: "無料プランでもずっとご利用いただけますか？",
    a: "はい。フリープランは無期限でご利用いただけます。収支記録は無制限、サブスクは5件までご登録いただけます。",
  },
  {
    q: "いつでも解約できますか？",
    a: "いつでも解約いただけます。解約後も次回更新日まではプランの機能をご利用いただけます。",
  },
  {
    q: "年払いはどのくらいお得ですか？",
    a: "年払いは月払いの約10ヶ月分の料金です。実質2ヶ月分がお得になります。",
  },
  {
    q: "ファミリー共有とは何ですか？",
    a: "家族で1つの共有帳簿を持ち、誰が・何に・いくらサブスクしているかをまとめて把握できる機能です。プラスは2人、プロは5人まで共有できます。",
  },
];

// Stripe / メール送信が使えるかどうかで表示が変わる。完全な静的生成だと
// ビルド時点の判定が焼き付き、あとで環境変数を設定しても反映されない。
// 検索に載せたいページなので静的のまま置き、一定時間で作り直す。
export const revalidate = 300;

export default function PricingPage() {
  const faqLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">
          あなたに合う、ちょうどいいプラン。
        </h1>
        <p className="mt-4 text-[18px] text-text-secondary">
          無料で始めて、必要になったらいつでもアップグレード。
        </p>
      </div>

      <div className="mt-14">
        <PricingTable stripeEnabled={isStripeEnabled} />
      </div>

      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center text-[26px] font-bold tracking-tight">プランを比較する</h2>
        <p className="mt-2 text-center text-[15px] text-text-secondary">
          すべての機能を一覧で。あなたに必要なものを見つけてください。
        </p>
        <div className="mt-8">
          <PlanComparison />
        </div>
      </div>

      <div className="mx-auto mt-24 max-w-2xl">
        <h2 className="text-center text-[26px] font-bold tracking-tight">よくある質問</h2>
        <div className="mt-8 divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-surface-1">
          {FAQ.map((f) => (
            <div key={f.q} className="px-6 py-5">
              <h3 className="text-[16px] font-semibold">{f.q}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <MarketingCta
        title="まずは無料で、はじめよう。"
        subtitle="フリープランは無期限。必要になったら、いつでもアップグレードできます。"
      />
    </div>
  );
}
