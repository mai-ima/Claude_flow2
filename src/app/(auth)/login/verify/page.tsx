import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TwoFactorForm } from "./two-factor-form";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";
import { pendingTwoFactorUserId } from "@/lib/two-factor-challenge";

export const metadata: Metadata = pageMetadata({
  title: "確認コードの入力",
  path: "/login/verify",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function TwoFactorPage() {
  // 待ち状態が無いのにここへ来ても意味が無い。ログインからやり直してもらう。
  const pending = await pendingTwoFactorUserId().catch(() => null);
  if (!pending) redirect("/login");

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
          <h1 className="text-center text-[22px] font-bold tracking-tight">確認コード</h1>
          <p className="mt-1.5 mb-6 text-center text-[14px] leading-relaxed text-text-secondary">
            認証アプリに表示されている6桁の数字を入力してください。
          </p>
          <Suspense>
            <TwoFactorForm />
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
