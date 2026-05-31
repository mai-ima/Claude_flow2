import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "利用規約",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <LegalShell title="利用規約" updated="2026年5月31日">
      <p>
        本利用規約（以下「本規約」）は、Tsumiki（以下「当サービス」）の利用条件を定めるものです。利用者は、本規約に同意のうえ当サービスを利用するものとします。
      </p>
      <h2>第1条（適用）</h2>
      <p>本規約は、当サービスの利用に関する一切の関係に適用されます。</p>
      <h2>第2条（アカウント）</h2>
      <p>
        利用者は、自己の責任においてアカウント情報を管理するものとし、第三者に利用させてはなりません。
      </p>
      <h2>第3条（有料プラン）</h2>
      <ul>
        <li>有料プランの料金、内容は料金プランのページに定めるとおりです。</li>
        <li>解約はいつでも可能で、解約後も次回更新日まで機能を利用できます。</li>
        <li>原則として、既にお支払い済みの料金の返金は行いません。</li>
      </ul>
      <h2>第4条（禁止事項）</h2>
      <p>法令違反、不正アクセス、当サービスの運営を妨げる行為を禁止します。</p>
      <h2>第5条（免責）</h2>
      <p>
        当サービスは、家計管理の補助を目的とするものであり、提供する情報・計算結果の完全性を保証するものではありません。
      </p>
      <h2>第6条（規約の変更）</h2>
      <p>当サービスは、必要に応じて本規約を変更できるものとします。</p>
    </LegalShell>
  );
}
