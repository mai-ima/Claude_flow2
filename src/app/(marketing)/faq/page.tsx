import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { pageMetadata, jsonLd, CONTACT } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "よくある質問",
  description:
    "Tsumiki（ツミキ）のよくある質問。はじめ方、料金、サブスク管理、家族共有、データの取り扱い、解約についてまとめました。",
  path: "/faq",
});

const GROUPS: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: "はじめ方",
    items: [
      {
        q: "Tsumiki とは何ですか？",
        a: "家計簿とサブスク管理をひとつにまとめた家計アプリです。収支の記録、予算、貯金目標、サブスクの更新リマインダー、無駄なサブスクの発見までを、わかりやすい可視化で行えます。",
      },
      {
        q: "登録せずに試せますか？",
        a: "はい。ログイン画面の「デモを試す」から、登録なしでサンプルデータを使って主要な機能をお試しいただけます。",
      },
      {
        q: "スマートフォンでも使えますか？",
        a: "はい。Web アプリとして PC・スマートフォンの両方に最適化されており、ホーム画面に追加してアプリのように使うこともできます。",
      },
    ],
  },
  {
    heading: "料金・プラン",
    items: [
      {
        q: "無料で使えますか？",
        a: "フリープランは¥0でご利用いただけます。予算・貯金目標・サブスク・スタックなどの一部機能はプラス以上でご利用いただけます。詳細は料金プランのページをご覧ください。",
      },
      {
        q: "支払い方法は？",
        a: "クレジットカード（Stripe）に対応しています。月額・年額からお選びいただけます。",
      },
      {
        q: "解約できますか？返金は？",
        a: "いつでも解約できます。解約後も当該請求期間の終了までは機能をご利用いただけます。原則として日割りの返金は行っていません。",
      },
    ],
  },
  {
    heading: "機能",
    items: [
      {
        q: "サブスクの更新を自動で家計簿に記録できますか？",
        a: "はい。サブスク登録時に自動記帳を有効にすると、更新日が来たときに支出として自動で記録されます。更新の数日前にはリマインダー通知も届きます。",
      },
      {
        q: "コストタイムとは？",
        a: "設定で想定時給を入力すると、支出を「働いた時間」に換算して表示します。お金の重みを直感的に把握できます。",
      },
      {
        q: "複数の通貨に対応していますか？",
        a: "設定から表示通貨を変更できます（円・ドル・ユーロなど）。なお、為替レートの自動換算は行わず、表示の整形のみを行います。",
      },
      {
        q: "家族と共有できますか？",
        a: "プラス以上で共有帳簿を作成し、家族を招待できます（プラスは2人、プロは5人まで）。誰が何にいくら払っているかを一覧で把握できます。",
      },
    ],
  },
  {
    heading: "データ・プライバシー",
    items: [
      {
        q: "入力したデータは広告に使われますか？",
        a: "いいえ。あなたの家計データを広告目的で第三者に販売・提供することはありません。詳細はプライバシーポリシーをご覧ください。",
      },
      {
        q: "データをバックアップできますか？",
        a: "プロプランでは、取引を CSV でエクスポート／インポートできます（設定 → データ）。",
      },
      {
        q: "アカウントを削除するとどうなりますか？",
        a: "設定からアカウントを削除すると、関連する家計データは合理的な期間内に削除されます。",
      },
    ],
  },
];

export default function FaqPage() {
  const faqLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GROUPS.flatMap((g) =>
      g.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    ),
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">よくある質問</h1>
      <p className="mt-4 text-[17px] text-text-secondary">
        Tsumiki の使い方や料金について、よくいただく質問をまとめました。
      </p>

      <div className="mt-12 space-y-10">
        {GROUPS.map((g) => (
          <section key={g.heading}>
            <h2 className="text-[14px] font-semibold text-text-tertiary">{g.heading}</h2>
            <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
              {g.items.map((f) => (
                <details key={f.q} className="group px-6 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] font-semibold">
                    {f.q}
                    <span className="ml-3 text-text-tertiary transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-surface-1 p-6 text-center">
        <p className="text-[15px] text-text-secondary">解決しませんでしたか？</p>
        <ButtonLink href="/contact" variant="gray" className="mt-3">
          お問い合わせ
        </ButtonLink>
        <p className="mt-3 text-[13px] text-text-tertiary">
          または {CONTACT.support} までご連絡ください。
        </p>
      </div>

      <MarketingCta
        title="疑問が解けたら、はじめよう。"
        subtitle="登録は1分。まずは無料で、家計とサブスクを整えましょう。"
      />

      <p className="mt-8 text-center text-[13px] text-text-tertiary">
        <Link href="/" className="hover:text-text-secondary">
          ← トップにもどる
        </Link>
      </p>
    </div>
  );
}
