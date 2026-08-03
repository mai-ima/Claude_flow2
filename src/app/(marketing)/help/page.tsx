import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "ヘルプセンター",
  description: "Tsumiki の使い方やよくある質問。お困りの際にご確認ください。",
  path: "/help",
});

const FAQ = [
  { q: "はじめ方は？", a: "「無料で始める」からメールアドレスとパスワードをご登録ください。登録なしで試したい場合はログイン画面の「デモを試す」をご利用ください。" },
  { q: "毎月決まった収支を自動で記録するには？", a: "家計簿の「定期」から定期取引を登録します。家賃や定期収入などを周期（毎月・毎週など）と次回の記録日とあわせて設定すると、以降は自動で記録されます。" },
  { q: "サブスクの更新日を自動で家計簿に記録できますか？", a: "はい。サブスク登録時に「更新日に自動で家計簿へ記帳」を有効にすると、更新日が来たら自動で支出として記録されます。値上げの履歴や無料体験の終了通知にも対応しています。" },
  { q: "貯金の自動積立を設定するには？", a: "貯金目標の編集で「毎月の自動積立」をオンにし、金額と実行日を指定します。積立の履歴は目標の画面でご確認いただけます。必要なときは引き出しも可能です（プラス以上）。" },
  { q: "取引をまとめて編集・削除するには？", a: "家計簿一覧の「選択」から複数の取引を選び、カテゴリ・支払い方法の変更や削除をまとめて行えます。" },
  { q: "コストタイムとは？", a: "設定で想定時給を入力すると、支出を「働いた時間」に換算して表示します。お金の重みを直感的に把握できます。" },
  { q: "家族と共有できますか？", a: "プラス以上で共有帳簿を作成し、家族を招待できます（プラス2人・プロ5人）。誰が何にいくら払っているかを一覧で把握できます。" },
  { q: "データのバックアップは？", a: "プロプランでは取引を CSV で書き出し・取り込みいただけます（設定 → データ）。" },
  { q: "解約できますか？", a: "いつでも解約いただけます。解約後も次回更新日まではプランの機能をご利用いただけます。" },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">ヘルプセンター</h1>
      <p className="mt-4 text-[17px] text-text-secondary">よくある質問をまとめました。</p>

      <div className="mt-10 divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        {FAQ.map((f) => (
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

      <div className="mt-10 rounded-2xl bg-surface-1 p-6 text-center">
        <p className="text-[15px] text-text-secondary">解決しない場合は、こちらもご確認ください。</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/faq" variant="gray">
            よくある質問
          </ButtonLink>
          <ButtonLink href="/contact" variant="gray">
            お問い合わせ
          </ButtonLink>
        </div>
      </div>

      <p className="mt-8 text-center text-[13px] text-text-tertiary">
        <Link href="/" className="hover:text-text-secondary">← トップへ戻る</Link>
      </p>
    </div>
  );
}
