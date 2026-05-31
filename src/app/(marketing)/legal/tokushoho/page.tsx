import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "特定商取引法に基づく表記",
  path: "/legal/tokushoho",
});

const ROWS: [string, string][] = [
  ["販売事業者", "（運営者名を記載）"],
  ["運営責任者", "（責任者名を記載）"],
  ["所在地", "（請求があった場合に遅滞なく開示します）"],
  ["連絡先", "（サポートメールアドレスを記載）"],
  ["販売価格", "各プランのページに表示する金額（消費税込み）"],
  ["商品代金以外の必要料金", "インターネット接続に係る通信料金等"],
  ["お支払い方法", "クレジットカード（Stripe を利用）"],
  ["支払時期", "お申し込み時、以降は毎月または毎年の更新日に自動課金"],
  ["役務の提供時期", "決済完了後、ただちにご利用いただけます"],
  ["解約・返金", "いつでも解約可能。原則として日割り返金は行いません"],
];

export default function TokushohoPage() {
  return (
    <LegalShell title="特定商取引法に基づく表記" updated="2026年5月31日">
      <div className="overflow-hidden rounded-2xl border border-border-subtle">
        <table className="w-full text-[14px]">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-b border-border-subtle last:border-0">
                <th className="w-40 bg-surface-2 px-4 py-3 text-left align-top font-medium text-text-primary">
                  {k}
                </th>
                <td className="px-4 py-3 text-text-secondary">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        ※ 本表記は有料プラン提供に際しての記載例です。実際の事業者情報に置き換えてご利用ください。
      </p>
    </LegalShell>
  );
}
