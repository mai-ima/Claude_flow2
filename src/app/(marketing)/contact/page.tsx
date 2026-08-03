import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ContactForm } from "@/modules/contact";
import { pageMetadata, CONTACT } from "@/lib/seo";
import { isEmailEnabled } from "@/lib/env";

export const metadata: Metadata = pageMetadata({
  title: "お問い合わせ",
  description: "Tsumiki へのお問い合わせ・ご要望・不具合のご報告を承ります。フォームから直接ご連絡いただけます。",
  path: "/contact",
});

// Stripe / メール送信が使えるかどうかで表示が変わる。完全な静的生成だと
// ビルド時点の判定が焼き付き、あとで環境変数を設定しても反映されない。
// 検索に載せたいページなので静的のまま置き、一定時間で作り直す。
export const revalidate = 300;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">お問い合わせ</h1>
      <p className="mt-4 text-[17px] text-text-secondary">
        ご質問・ご要望・不具合のご報告をお待ちしています。下のフォームからお送りください。
      </p>

      <div className="mt-10">
        <ContactForm emailEnabled={isEmailEnabled} />
      </div>

      <p className="mt-6 text-center text-[13px] text-text-tertiary">
        メールで直接ご連絡の場合は{" "}
        <a href={`mailto:${CONTACT.support}`} className="text-accent">
          {CONTACT.support}
        </a>{" "}
        まで。
      </p>

      <div className="mt-10 rounded-2xl bg-surface-1 p-6 text-center">
        <p className="text-[15px] text-text-secondary">先によくある質問もご確認ください。</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/faq" variant="gray">
            よくある質問
          </ButtonLink>
          <ButtonLink href="/help" variant="gray">
            ヘルプセンター
          </ButtonLink>
        </div>
      </div>

      <p className="mt-8 text-center text-[13px] text-text-tertiary">
        <Link href="/" className="hover:text-text-secondary">← トップへ戻る</Link>
      </p>
    </div>
  );
}
