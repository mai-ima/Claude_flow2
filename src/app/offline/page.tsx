import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "オフラインです", noindex: true });

/**
 * 通信できないときに出す画面。
 *
 * 金額は一切出さない。サービスワーカーがこの画面だけを保存しているので、
 * ここに数字を書くと、圏外で古い金額を見せてしまう。
 *
 * 静的に固める（force-static）。データを引きにいくと、そもそも
 * オフラインでは表示できない。
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-[22px] font-bold tracking-tight">通信できません</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
          電波の届く場所へ移動するか、Wi-Fi につないでからもう一度お試しください。
        </p>
        <p className="mt-4 text-[12px] leading-relaxed text-text-tertiary">
          金額は端末に保存していません。オフラインのあいだ、家計簿の中身は
          表示されません。古い数字をお見せしないためです。
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent-solid px-6 text-[15px] font-medium text-white"
        >
          もう一度読み込む
        </a>
      </div>
    </main>
  );
}
