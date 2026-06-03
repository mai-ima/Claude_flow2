import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { pageMetadata, CONTACT, OPERATOR } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "特定商取引法に基づく表記",
  description: "Tsumiki（ツミキ）の特定商取引法に基づく表記。販売事業者、料金、支払い方法、解約・返金等を記載します。",
  path: "/legal/tokushoho",
});

const ROWS: [string, string][] = [
  ["販売事業者", OPERATOR.name],
  ["運営責任者", "（請求があった場合に遅滞なく開示します）"],
  ["所在地", OPERATOR.addressDisclosure],
  ["連絡先", CONTACT.support],
  ["販売価格", "各プランのページに表示する金額（消費税込み）"],
  ["商品代金以外の必要料金", "インターネット接続に係る通信料金等はお客様のご負担となります"],
  ["お支払い方法", "クレジットカード（Stripe を利用）"],
  ["支払時期", "お申し込み時、以降は毎月または毎年の更新日に自動課金"],
  ["役務の提供時期", "決済完了後、ただちにご利用いただけます"],
  ["解約", "いつでも解約可能。解約後も当該請求期間の終了までご利用いただけます"],
  ["返金", "サービスの性質上、原則として日割りでの返金は行いません"],
];

export default function TokushohoPage() {
  return (
    <LegalShell title="特定商取引法に基づく表記" updated="2026年6月3日">
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
      <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-text-secondary">
        当サービスはベータ版です。運営責任者名・所在地は、法令に基づき請求があった場合に遅滞なく開示します。正式提供の開始にあたっては、実際の事業者情報を記載します。
      </p>
    </LegalShell>
  );
}
