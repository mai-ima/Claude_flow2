import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "プライバシーポリシー",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalShell title="プライバシーポリシー" updated="2026年5月31日">
      <p>
        Tsumiki（以下「当サービス」）は、利用者のプライバシーを尊重し、個人情報および家計データの保護に努めます。本ポリシーは、当サービスが取得する情報とその取り扱いについて説明します。
      </p>
      <h2>取得する情報</h2>
      <ul>
        <li>アカウント情報（メールアドレス、表示名）</li>
        <li>利用者が入力した家計データ（収支、カテゴリ、予算、サブスク情報）</li>
        <li>サービス改善のための匿名の利用状況</li>
      </ul>
      <h2>情報の利用目的</h2>
      <ul>
        <li>当サービスの提供・維持・改善</li>
        <li>更新リマインダー等の通知の送信</li>
        <li>不正利用の防止とセキュリティの確保</li>
      </ul>
      <h2>第三者提供</h2>
      <p>
        当サービスは、利用者の家計データを広告目的で第三者に販売・提供することはありません。法令に基づく場合を除き、本人の同意なく第三者へ提供しません。
      </p>
      <h2>外部サービス</h2>
      <p>
        決済処理に Stripe、メール送信に Resend を利用する場合があります。これらの利用には各社のプライバシーポリシーが適用されます。
      </p>
      <h2>お問い合わせ</h2>
      <p>本ポリシーに関するお問い合わせは、サポート窓口までご連絡ください。</p>
    </LegalShell>
  );
}
