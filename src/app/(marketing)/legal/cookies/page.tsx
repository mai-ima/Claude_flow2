import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { pageMetadata, CONTACT } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie ポリシー",
  description:
    "Tsumiki（ツミキ）の Cookie ポリシー。利用する Cookie の種類（必須・任意）、目的、無効化の方法についてご説明します。",
  path: "/legal/cookies",
});

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie ポリシー" updated="2026年6月3日">
      <p>
        Tsumiki（以下「当サービス」）は、サービスの提供と改善のために Cookie および類似の技術（以下まとめて「Cookie」）を利用します。本ポリシーは、当サービスが利用する Cookie の種類と目的、その管理方法についてご説明します。
      </p>

      <h2>Cookie とは</h2>
      <p>
        Cookie は、ウェブサイトが利用者のブラウザに保存する小さなデータです。ログイン状態の維持や設定の記憶などに用いられます。
      </p>

      <h2>当サービスが利用する Cookie</h2>
      <ul>
        <li>
          必須の Cookie: ログイン状態（セッション）の維持、テーマ（ダーク／ライト）や表示の設定など、サービスの基本的な動作に必要なものです。これらが無効の場合、当サービスを正しくご利用いただけないことがあります。
        </li>
        <li>
          任意の Cookie: サービス改善のために、匿名の利用状況を把握するアクセス解析に用いる場合があります。個人を特定する目的では利用しません。
        </li>
      </ul>

      <h2>第三者の Cookie</h2>
      <p>
        決済（Stripe）など、当サービスが利用する外部サービスが、それぞれの目的のために Cookie を設定する場合があります。これらには各社のポリシーが適用されます。
      </p>

      <h2>Cookie の管理・無効化</h2>
      <p>
        利用者は、ブラウザの設定により Cookie の受け入れを拒否し、または既存の Cookie を削除できます。ただし、必須の Cookie を無効にすると、ログインの維持など一部の機能が利用できなくなる場合があります。設定方法はお使いのブラウザのヘルプをご確認ください。
      </p>

      <h2>お問い合わせ</h2>
      <p>
        Cookie の取り扱いに関するお問い合わせは、{CONTACT.privacy} までご連絡ください。あわせて
        <a href="/legal/privacy" className="text-accent underline">プライバシーポリシー</a>
        もご覧ください。
      </p>
    </LegalShell>
  );
}
