import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActivityRing } from "@/components/ui/activity-ring";
import {
  RepeatIcon,
  ChartIcon,
  BellIcon,
  UsersIcon,
  SparklesIcon,
  WalletIcon,
  ClockIcon,
  ShieldIcon,
} from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = pageMetadata({ path: "/" });

const FEATURES = [
  {
    icon: WalletIcon,
    title: "家計簿",
    body: "収入も支出も、ハーフシートから片手でサッと記録。カテゴリと予算で、お金の流れが自然に整います。",
  },
  {
    icon: RepeatIcon,
    title: "サブスク管理",
    body: "更新日・年額換算・合計コストを一目で。決済日が来たら自動で家計簿に記帳されます。",
  },
  {
    icon: ClockIcon,
    title: "コストタイム",
    body: "支出をあなたの「働いた時間」に換算。月980円は、人生の何分ぶんか——数字に体温を。",
  },
  {
    icon: SparklesIcon,
    title: "サブスク・レビュー",
    body: "1件ずつ美しいカードで仕分け。使っていない固定費を、ゲーム感覚で見直せます。",
  },
  {
    icon: BellIcon,
    title: "更新リマインダー",
    body: "請求の前に、静かにお知らせ。気づかぬうちの自動更新を防ぎます。",
  },
  {
    icon: UsersIcon,
    title: "ファミリー共有",
    body: "家族で1つの帳簿を。誰が・何に・いくら払っているかを、みんなで把握できます。",
  },
];

export default function LandingPage() {
  return (
    <>
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
          <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-bold leading-[1.05] tracking-tight">
            お金の全体像を、
            <br />
            美しく積み上げる。
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-text-secondary">
            {SITE.nameJa}は、毎日の収支も、見落としがちなサブスクも、ひとつの場所で。
            洗練された体験で、家計の最適化を当たり前に。
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/login" size="lg">
              無料で始める
            </ButtonLink>
            <ButtonLink href="/features" size="lg" variant="gray">
              機能を見る
            </ButtonLink>
          </div>
          <p className="mt-4 text-[13px] text-text-tertiary">
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
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 text-[18px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{f.body}</p>
            </Card>
          ))}
        </div>
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
          <ButtonLink href="/login" size="lg">
            無料で始める
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
