import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActivityRing } from "@/components/ui/activity-ring";
import { Reveal } from "@/components/marketing/reveal";
import { demoLoginAction } from "@/app/(auth)/actions";
import {
  RepeatIcon,
  ChartIcon,
  BellIcon,
  UsersIcon,
  SparklesIcon,
  WalletIcon,
  ClockIcon,
  ShieldIcon,
  StarIcon,
  TargetIcon,
  CalendarIcon,
  HeartIcon,
} from "@/components/icons";
import { pageMetadata, SITE, jsonLd } from "@/lib/seo";
import { formatMoney } from "@/lib/money";

const VOICES = [
  {
    quote: "サブスクの更新日がひと目で分かるのが本当に便利。気づけば固定費が3,000円も減りました。",
    name: "28歳・会社員",
  },
  {
    quote: "コストタイムで「この出費は2時間分」と分かると、無駄遣いが自然と減りました。",
    name: "34歳・フリーランス",
  },
  {
    quote: "家族で共有して、誰が何に払っているかひと目で把握でき。重複した契約を解約できました。",
    name: "41歳・主婦",
  },
];

const FAQS = [
  { q: "無料でどこまでご利用いただけますか？", a: "収支記録は無制限、サブスクは5件までご登録いただけます。基本のダッシュボードやコストタイムも無料でご利用いただけます。" },
  { q: "銀行口座やカードと連携できますか？", a: "あえて自動連携には対応せず、手動入力に特化しています。その分、情報の安全性が高く、必要なものだけを軽快に管理いただけます。" },
  { q: "スマホでもご利用いただけますか？", a: "はい。スマホ・タブレット・PC すべてに最適化しています。ホーム画面に追加いただくと、アプリのようにご利用いただけます。" },
  { q: "解約は簡単に行えますか？", a: "いつでも解約いただけます。解約後も次回更新日まではプランの機能をご利用いただけます。" },
];

export const metadata: Metadata = pageMetadata({ path: "/" });

const FEATURES = [
  {
    icon: WalletIcon,
    title: "家計簿",
    body: "収入も支出も、ハーフシートから片手で手早く。繰り返し取引や一括編集で、記録の手間を限りなくゼロへ。",
  },
  {
    icon: CalendarIcon,
    title: "カレンダー表示",
    body: "1ヶ月の収支をカレンダーで一覧。どの日にいくら使ったかが、めくるだけで分かります。リスト表示とワンタップで切り替えられます。",
  },
  {
    icon: ChartIcon,
    title: "8つの切り口の分析",
    body: "支出・収入・収支・年間・貯蓄・貯蓄率・予算。タブを切り替えるだけで、目的に合ったグラフが表示されます。",
  },
  {
    icon: HeartIcon,
    title: "家計の健康度",
    body: "貯蓄率・予算の守り方・固定費の重さ・記録の続き方を点数に。なぜその点数なのか、根拠もあわせて表示します。",
  },
  {
    icon: RepeatIcon,
    title: "サブスク管理",
    body: "更新日・年額換算・合計を一目で。決済日には自動で記帳。値上げ検知や無料体験の終了通知で、変化も見逃しません。",
  },
  {
    icon: ClockIcon,
    title: "コストタイム",
    body: "支出をあなたの「働いた時間」に換算。月980円は、人生の何分か——数字に体温を。",
  },
  {
    icon: TargetIcon,
    title: "予算・貯金目標",
    body: "予算は円グラフ＋超過アラート、過去平均からの提案も。目標は毎月の自動積立と履歴で、未来をかたちに。",
  },
  {
    icon: BellIcon,
    title: "更新リマインダー",
    body: "更新の当日〜30日前まで、サブスクごとに通知を設定。気づかぬうちの自動更新を防ぎます。",
  },
  {
    icon: UsersIcon,
    title: "ファミリー共有",
    body: "家族で1つの帳簿を。誰が・何に・いくら払っているかを、ご家族全員で把握いただけます。",
  },
];

export default function LandingPage() {
  const faqLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-32 h-[420px] opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, color-mix(in srgb, var(--accent) 35%, transparent), transparent)",
          }}
        />
        <div className="mx-auto max-w-3xl px-5 pt-24 pb-16 text-center sm:pt-32">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1 px-3.5 py-1.5 text-[13px] text-text-secondary">
            <SparklesIcon size={15} className="text-accent" />
            家計簿とサブスク管理を、ひとつに。
          </div>
          <h1 className="text-[clamp(2.8rem,7.5vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.03em]">
            お金の全体像を、
            <br />
            美しく積み上げる。
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-text-secondary">
            {SITE.nameJa}は、毎日の収支も、見落としがちなサブスクも、ひとつの場所で。
            洗練された体験で、家計の最適化を当たり前に。
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">
              無料で始める
            </ButtonLink>
            <ButtonLink href="/features" size="lg" variant="gray">
              機能を見る
            </ButtonLink>
          </div>
          <form action={demoLoginAction} className="mt-4">
            <button
              type="submit"
              className="text-[14px] font-medium text-accent transition hover:opacity-70"
            >
              または、登録なしでデモを試す →
            </button>
          </form>
          <p className="mt-3 text-[13px] text-text-tertiary">
            クレジットカード登録不要・いつでも解約可能
          </p>
        </div>

        {/* Hero visual */}
        <div className="mx-auto max-w-4xl px-5 pb-10">
          <Card className="overflow-hidden p-6 sm:p-10">
            <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
              <ActivityRing
                size={180}
                thickness={16}
                tracks={[
                  { value: 0.62, color: "var(--color-income)" },
                  { value: 0.41, color: "var(--color-expense)" },
                ]}
              >
                <div>
                  <div className="text-[12px] text-text-tertiary">今月の支出</div>
                  <div className="text-[24px] font-bold tracking-tight">
                    {formatMoney(184200)}
                  </div>
                  <div className="mt-1 text-[12px] text-income">予算内 ・ あと38%</div>
                </div>
              </ActivityRing>
              <div className="space-y-3">
                {[
                  { name: "Netflix", note: "毎月15日更新", amount: 1490, tone: "text-expense" },
                  { name: "給与", note: "今日 入金", amount: 320000, tone: "text-income" },
                  { name: "食費 ・ スーパー", note: "今日", amount: 3280, tone: "text-expense" },
                ].map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3"
                  >
                    <div>
                      <div className="text-[15px] font-medium">{r.name}</div>
                      <div className="text-[12px] text-text-tertiary">{r.note}</div>
                    </div>
                    <div className={`text-[15px] font-semibold tabular-nums ${r.tone}`}>
                      {r.amount > 0 && r.tone === "text-income" ? "+" : ""}
                      {formatMoney(r.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Trust band */}
      <section className="mx-auto max-w-5xl px-5 pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { stat: "40+", label: "解約アシスト対応サービス" },
            { stat: "¥0", label: "ずっと使える無料プラン" },
            { stat: "連携なし", label: "口座・カードの自動連携に非依存" },
            { stat: "広告非販売", label: "データを広告に売りません" },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-5 text-center"
            >
              <div className="text-[22px] font-bold tracking-tight text-accent">{t.stat}</div>
              <div className="mt-1 text-[12px] leading-snug text-text-secondary">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-tight">
            必要なものは、すべて。
          </h2>
          <p className="mt-4 text-[17px] text-text-secondary">
            記録から分析、サブスクの見直しまで。家計のためのツールを、ひとつのアプリに。
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <Card className="h-full p-6 hover-lift">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 text-[18px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{f.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-tight">
            3ステップで、すぐに。
          </h2>
          <p className="mt-4 text-[17px] text-text-secondary">
            むずかしい設定はいりません。今日から始められます。
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            { n: "01", icon: WalletIcon, title: "記録する", body: "収支とサブスクを、ハーフシートから手早く入力。" },
            { n: "02", icon: ChartIcon, title: "見える化", body: "予算は円グラフ、進捗はアクティビティリングで一目に。" },
            { n: "03", icon: SparklesIcon, title: "見直す", body: "無駄なサブスクを発見して、固定費を最適化。" },
          ].map((s) => (
            <Card key={s.n} className="relative p-7 hover-lift">
              <span className="text-[13px] font-bold text-accent">{s.n}</span>
              <div className="mt-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                <s.icon size={24} />
              </div>
              <h3 className="mt-4 text-[18px] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Tsumiki */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <Card className="overflow-hidden p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(1.6rem,4vw,2.2rem)] font-bold tracking-tight">
              なぜ、Tsumiki なのか。
            </h2>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { title: "美しさは、続く力。", body: "毎日ひらきたくなる UI。だから記録が習慣になります。" },
              { title: "サブスクに、強い。", body: "更新日・年額・無駄検出まで。固定費の管理は群を抜きます。" },
              { title: "プライバシー第一。", body: "口座連携に頼らない設計。データを広告に売りません。" },
            ].map((v) => (
              <div key={v.title}>
                <h3 className="text-[17px] font-semibold tracking-tight">{v.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{v.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Privacy band */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <Card className="flex flex-col items-center gap-4 p-10 text-center sm:flex-row sm:text-left">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-success/12 text-success">
            <ShieldIcon size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-[20px] font-semibold tracking-tight">あなたのお金の話は、あなたのもの。</h3>
            <p className="mt-1.5 text-[15px] text-text-secondary">
              データはアカウントに安全に紐づけられ、広告のために売られることはありません。
            </p>
          </div>
          <ButtonLink href="/legal/privacy" variant="gray">
            プライバシー
          </ButtonLink>
        </Card>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-tight">
            使う人の、声。
          </h2>
          <p className="mt-4 text-[17px] text-text-secondary">
            毎日の家計に、小さな変化を。
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {VOICES.map((v, i) => (
            <Reveal key={v.name} delay={i * 80}>
              <Card className="h-full p-6 hover-lift">
                <div className="flex gap-0.5 text-accent">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <StarIcon key={j} size={16} />
                  ))}
                </div>
                <p className="mt-4 text-[15px] leading-relaxed">{v.quote}</p>
                <p className="mt-4 text-[13px] text-text-tertiary">{v.name}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <Reveal className="text-center">
          <h2 className="text-[clamp(1.6rem,4vw,2.2rem)] font-bold tracking-tight">よくある質問</h2>
        </Reveal>
        <Reveal className="mt-8 divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {FAQS.map((f) => (
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
        </Reveal>
        <p className="mt-6 text-center text-[14px]">
          <a href="/faq" className="font-medium text-accent transition hover:opacity-70">
            すべての質問を見る →
          </a>
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <ChartIcon size={40} className="mx-auto text-accent" />
        <h2 className="mt-5 text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight">
          今日から、積み上げよう。
        </h2>
        <p className="mt-4 text-[17px] text-text-secondary">
          無料で始めて、必要になったらアップグレード。
        </p>
        <div className="mt-8">
          <ButtonLink href="/signup" size="lg">
            無料で始める
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
