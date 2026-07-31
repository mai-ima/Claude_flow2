import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "パスワードの再設定",
  path: "/reset-password",
  noindex: true,
});

export default function ResetPasswordPage() {
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
            新しいパスワード
          </h1>
          <p className="mt-1.5 mb-6 text-center text-[14px] text-text-secondary">
            新しいパスワードを設定してください。
          </p>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
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
