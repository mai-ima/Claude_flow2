import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { pageMetadata, CONTACT } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie ポリシー",
  description:
    "Tsumiki（ツミキ）の Cookie ポリシー。利用する Cookie の種類（必須・任意）、端末の中にだけ保存する情報、目的、無効化の方法についてご説明します。",
  path: "/legal/cookies",
});

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie ポリシー" updated="2026年8月1日">
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
          必須の Cookie: ログイン状態（セッション）の維持など、サービスの基本的な動作に必要なものです。これらが無効の場合、当サービスを正しくご利用いただけないことがあります。
        </li>
        <li>
          任意の Cookie: サービス改善のために、匿名の利用状況を把握するアクセス解析に用いる場合があります。個人を特定する目的では利用しません。
        </li>
      </ul>

      <h2>端末の中にだけ保存する情報</h2>
      <p>
        次のものは、お使いの端末の中（ブラウザの保存領域）にのみ保存し、当サービスへ送信しません。端末を変えると引き継がれません。
      </p>
      <ul>
        <li>テーマ（ライト／ダーク／自動）とスキンの選択</li>
        <li>家計簿の絞り込み条件（画面を移って戻っても残るようにするため）</li>
        <li>ご意見・不具合のご報告の書きかけ（送信すると消えます）</li>
        <li>案内や告知を閉じたかどうか（同じものを何度も出さないため）</li>
      </ul>

      <h2>第三者の Cookie</h2>
      <p>
        決済（Stripe）など、当サービスが利用する外部サービスが、それぞれの目的のために Cookie を設定する場合があります。これらには各社のポリシーが適用されます。
      </p>

      <h2>オフラインでの表示について</h2>
      <p>
        電波の届かない場所でも案内の画面を出せるよう、当サービスは画面の枠組みを端末内に控えます。金額や記録などの家計データは控えません。古い数字が残って表示されることを避けるためです。
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
