import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { demoLoginAction } from "../actions";
import { Card } from "@/components/ui/card";
import { LogoMark, SparklesIcon } from "@/components/icons";
import { pageMetadata, SITE } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = pageMetadata({
  title: "ログイン",
  path: "/login",
  noindex: true,
});

export default async function LoginPage() {
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
          <h1 className="text-center text-[22px] font-bold tracking-tight">ログイン</h1>
          <p className="mt-1.5 mb-6 text-center text-[14px] text-text-secondary">
            おかえりなさい。アカウントにサインインします。
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-subtle" />
            <span className="text-[12px] text-text-tertiary">または</span>
            <span className="h-px flex-1 bg-border-subtle" />
          </div>

          <form action={demoLoginAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-2 px-5 py-3 text-[15px] font-medium transition hover:opacity-80"
            >
              <SparklesIcon size={18} className="text-accent" />
              デモを試す（サンプルデータ入り）
            </button>
          </form>
          <p className="mt-2 text-center text-[12px] text-text-tertiary">
            登録不要。山田太郎さんの家計簿をそのまま体験できます。
          </p>
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
