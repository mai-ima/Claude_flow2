import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { publishedReleases } from "@/modules/releases/queries";
import { ReleaseCard } from "@/modules/releases/components/release-card";

export const metadata: Metadata = pageMetadata({
  title: "リリースノート",
  description: "Tsumiki のアップデート履歴。新機能や改善をお知らせします。",
  path: "/changelog",
});

/**
 * 管理画面からノートを公開したときに反映されるよう ISR にする。
 * 毎リクエスト DB を引く必要は無い（更新頻度は低い）。
 */
export const revalidate = 300;

export default async function ChangelogPage() {
  const releases = await publishedReleases();

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">リリースノート</h1>
      <p className="mt-4 text-[17px] text-text-secondary">
        新機能や改善のお知らせ。よりよい家計体験へ、こつこつ積み上げます。
      </p>

      <div className="mt-12 space-y-6">
        {releases.map((r, i) => (
          <ReleaseCard
            key={r.version}
            version={r.version}
            title={r.title}
            date={r.date}
            sections={r.sections}
            summary={r.summary}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
