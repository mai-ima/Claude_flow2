import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";
import { isEmailEnabled } from "@/lib/env";

export const metadata: Metadata = pageMetadata({
  title: "パスワードをお忘れの方",
  path: "/forgot-password",
  noindex: true,
});

// このページの表示はメール送信が使えるかどうかで変わる。静的生成すると
// ビルド時点の判定が焼き付き、あとで送信キーを設定しても「準備中」の
// ままになる。検索対象でもないので、毎回その場で判定する。
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-solid text-white">
            <LogoMark size={22} />
          </span>
          <span className="text-[19px]">{SITE.name}</span>
        </Link>
        <Card className="p-7">
          <h1 className="text-center text-[22px] font-bold tracking-tight">
            パスワードの再設定
          </h1>
          <p className="mt-1.5 mb-6 text-center text-[14px] text-text-secondary">
            ご登録のメールアドレスに、再設定のご案内をお送りします。
          </p>
          {/* メール送信が未設定の環境で「送りました」と言うと、
              永遠に届かないメールを待たせることになる。先に伝える。 */}
          {isEmailEnabled ? (
            <ForgotPasswordForm />
          ) : (
            <p className="rounded-xl border border-border-subtle bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-text-secondary">
              ただいまメールの送信を準備中のため、この方法はご利用いただけません。
              お手数ですが
              <Link href="/contact" className="font-medium text-accent">
                お問い合わせ
              </Link>
              からご連絡ください。
            </p>
          )}
        </Card>
        <p className="mt-6 text-center text-[13px] text-text-tertiary">
          <Link href="/login" className="hover:text-text-secondary">
            ← ログインにもどる
          </Link>
        </p>
      </div>
    </div>
  );
}
