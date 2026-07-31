import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";
import { consumeToken } from "@/lib/verification-token";
import { markEmailVerified } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const metadata: Metadata = pageMetadata({
  title: "メールアドレスの確認",
  path: "/verify-email",
  noindex: true,
});

/**
 * メール内のリンクを開いた先。
 *
 * トークンは開いた時点で使い切る。確認の完了はここで完結させ、
 * ログインしているかどうかは問わない（別の端末で開くことがあるため）。
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  if (token) {
    try {
      const email = await consumeToken("verify", token);
      if (email) {
        await markEmailVerified(email);
        ok = true;
      }
    } catch (err) {
      logger.error("email verification failed", err);
    }
  }

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
          <h1 className="text-[22px] font-bold tracking-tight">
            {ok ? "確認が完了しました" : "確認できませんでした"}
          </h1>
          <p className="mt-2 mb-6 text-[14px] leading-relaxed text-text-secondary">
            {ok
              ? "メールアドレスの確認が完了しました。ご利用ありがとうございます。"
              : "このリンクは使えません。期限が切れているか、すでに使用済みです。設定画面から確認メールを再送できます。"}
          </p>
          <Link href={ok ? "/dashboard" : "/settings"} className="block">
            <Button full size="lg">
              {ok ? "ホームへ" : "設定を開く"}
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
