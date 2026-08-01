import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "メールをご確認ください",
  path: "/signup/sent",
  noindex: true,
});

/**
 * 新規登録の受付完了。
 *
 * 「新しく作られた」場合と「すでに登録済みだった」場合の、どちらもここへ来る。
 * 文面で区別してはいけない。区別が付くと、登録フォームを叩くだけで
 * そのアドレスが会員かどうかを調べられてしまう。
 * どちらだったかは、届いたメールを読める本人だけが分かる。
 */
export default function SignupSentPage() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-solid text-white">
            <LogoMark size={22} />
          </span>
          <span className="text-[19px]">{SITE.name}</span>
        </Link>
        <Card className="p-7 text-center">
          <h1 className="text-[22px] font-bold tracking-tight">メールをご確認ください</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
            ご入力のメールアドレス宛に、これからの手続きをお送りしました。
            メール内のリンクを開くと、ご利用を始められます。
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-text-tertiary">
            届かない場合は、迷惑メールフォルダもご確認ください。
            すでにご登録済みのアドレスだった場合は、ログインのご案内をお送りしています。
          </p>
          <Link href="/login" className="mt-6 block">
            <Button full size="lg">
              ログイン画面へ
            </Button>
          </Link>
        </Card>
        <p className="mt-6 text-center text-[13px] text-text-tertiary">
          <Link href="/" className="hover:text-text-secondary">
            ← トップにもどる
          </Link>
        </p>
      </div>
    </div>
  );
}
