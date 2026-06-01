import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = pageMetadata({
  title: "新規登録",
  path: "/signup",
  noindex: true,
});

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
            <LogoMark size={22} />
          </span>
          <span className="text-[19px]">{SITE.name}</span>
        </Link>
        <Card className="p-7">
          <h1 className="text-center text-[22px] font-bold tracking-tight">新規登録</h1>
          <p className="mt-1.5 mb-6 text-center text-[14px] text-text-secondary">
            無料でアカウントを作成して、今日から始めましょう。
          </p>
          <Suspense>
            <SignupForm />
          </Suspense>
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
