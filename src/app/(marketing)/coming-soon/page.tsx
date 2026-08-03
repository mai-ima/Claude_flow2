import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { SparklesIcon } from "@/components/icons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "準備中",
  description: "この機能は現在開発中です。公開まで、いましばらくお待ちください。",
  path: "/coming-soon",
  noindex: true,
});

export default function ComingSoonPage() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-5 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
          <SparklesIcon size={32} />
        </div>
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">準備中です</h1>
        <p className="mx-auto mt-3 max-w-sm text-[16px] leading-relaxed text-text-secondary">
          この機能は現在開発中です。よりよい体験をお届けできるよう、丁寧に作り込んでいます。公開まで、いましばらくお待ちください。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/">トップへ</ButtonLink>
          <ButtonLink href="/features" variant="gray">
            機能を見る
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
