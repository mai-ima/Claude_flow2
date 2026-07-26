import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/icons";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <Link href="/" className="mb-8 inline-flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-solid text-white">
            <LogoMark size={22} />
          </span>
          <span className="text-[19px]">{SITE.name}</span>
        </Link>
        <p className="text-[64px] font-bold leading-none tracking-tight text-text-tertiary">404</p>
        <h1 className="mt-3 text-[24px] font-bold tracking-tight">ページが見つかりません</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-text-secondary">
          お探しのページは移動または削除された可能性があります。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/">トップへ</ButtonLink>
          <ButtonLink href="/dashboard" variant="gray">
            アプリへ
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
