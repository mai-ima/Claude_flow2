import { ButtonLink } from "@/components/ui/button";

/**
 * マーケ各ページ末尾で共通利用する CTA セクション。
 * 文言・副ボタンを差し替え可能（既定は新規登録 + 機能ページ導線）。
 */
export function MarketingCta({
  title = "今日から、積み上げる。",
  subtitle = "無料で始めて、必要になったらアップグレード。",
  secondaryHref = "/features",
  secondaryLabel = "機能を見る",
}: {
  title?: string;
  subtitle?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 text-center">
      <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight">{title}</h2>
      <p className="mt-4 text-[17px] text-text-secondary">{subtitle}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/signup" size="lg">
          無料で始める
        </ButtonLink>
        <ButtonLink href={secondaryHref} size="lg" variant="gray">
          {secondaryLabel}
        </ButtonLink>
      </div>
      <p className="mt-3 text-[13px] text-text-tertiary">
        クレジットカード登録不要・いつでも解約可能
      </p>
    </section>
  );
}
