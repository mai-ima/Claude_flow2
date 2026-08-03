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
        a: "家計簿とサブスク管理をひとつにまとめた家計アプリです。収支の記録、予算、貯金目標、サブスクの更新リマインダー、使っていないサブスクの発見までを、分かりやすいグラフでご確認いただけます。",
      },
      {
        q: "登録せずに試せますか？",
        a: "はい。ログイン画面の「デモを試す」から、登録なしでサンプルデータを使って主要な機能をお試しいただけます。",
      },
      {
        q: "スマートフォンでもご利用いただけますか？",
        a: "はい。Web アプリとして PC・スマートフォンの両方に最適化されており、ホーム画面に追加すると、アプリのようにご利用いただけます。",
      },
    ],
  },
  {
    heading: "料金・プラン",
    items: [
      {
        q: "無料でご利用いただけますか？",
        a: "フリープランは¥0でご利用いただけます。記録・カレンダー・分析・タグ・家計の健康度・月次レポートは無料でお使いいただけます。予算・貯金目標・更新リマインダー・ファミリー共有はプラス以上、サブスク・レビューと CSV の書き出し・取り込みはプロでご利用いただけます。詳細は料金プランのページをご覧ください。",
      },
      {
        q: "支払い方法は？",
        a: "クレジットカード（Stripe）に対応しています。月額・年額からお選びいただけます。",
      },
      {
        q: "解約できますか？返金は？",
        a: "いつでも解約いただけます。解約後も当該請求期間の終了までは機能をご利用いただけます。原則として日割りの返金は行っていません。",
      },
    ],
  },
  {
    heading: "機能",
    items: [
      {
        q: "毎月決まった収支を自動で記録できますか？",
        a: "はい。家賃や定期収入などを「定期取引」として登録すると、毎月・毎週・四半期・毎年の周期で自動的に家計簿へ記録されます。しばらく開いていなかった場合も、到来済みの分をまとめて記録します。",
      },
      {
        q: "サブスクの更新を自動で家計簿に記録できますか？",
        a: "はい。サブスク登録時に自動記帳を有効にすると、更新日が来たときに支出として自動で記録されます。更新の数日前にはリマインダー通知も届きます。",
      },
      {
        q: "サブスクの値上げや無料体験の終了に気づけますか？",
        a: "サブスクの金額を変更すると価格改定の履歴が自動で記録され、値上げは一覧でひと目で分かります。無料体験（トライアル）の終了日を設定しておくと、終了が近づいたときに通知でお知らせします。",
      },
      {
        q: "貯金は自動で積み立てられますか？",
        a: "貯金目標に「毎月の自動積立」を設定すると、指定した日に自動で積み立てられます。積立の履歴を一覧で確認でき、必要なときは引き出しもできます（予算・貯金目標はプラス以上の機能です）。",
      },
      {
        q: "予算の使いすぎは通知されますか？",
        a: "カテゴリや全体の予算が80%・100%に達すると通知でお知らせします。予算を決めるときは、過去3か月の平均から金額を提案します（プラス以上の機能です）。",
      },
      {
        q: "多くの取引をまとめて整理できますか？",
        a: "家計簿の一覧で複数の取引を選択し、カテゴリや支払い方法の変更・削除をまとめて行えます。",
      },
      {
        q: "コストタイムとは？",
        a: "設定で想定時給を入力すると、支出を「働いた時間」に換算して表示します。お金の重みを直感的に把握できます。",
      },
      {
        q: "複数の通貨に対応していますか？",
        a: "設定から表示通貨を変更いただけます（円・ドル・ユーロなど）。なお、為替レートの自動換算は行わず、表示の整形のみを行います。",
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
        a: "プロプランでは、取引を CSV で書き出し・取り込みいただけます（設定 → データ）。",
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
        <p className="text-[15px] text-text-secondary">解決しない場合は、お問い合わせください。</p>
        <ButtonLink href="/contact" variant="gray" className="mt-3">
          お問い合わせ
        </ButtonLink>
        <p className="mt-3 text-[13px] text-text-tertiary">
          または {CONTACT.support} までご連絡ください。
        </p>
      </div>

      <MarketingCta
        title="疑問が解けたら、はじめる。"
        subtitle="登録は1分。無料で、家計とサブスクを整えられます。"
      />

      <p className="mt-8 text-center text-[13px] text-text-tertiary">
        <Link href="/" className="hover:text-text-secondary">
          ← トップへ戻る
        </Link>
      </p>
    </div>
  );
}
