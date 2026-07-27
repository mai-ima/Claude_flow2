import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon } from "@/components/icons";
import { pageMetadata } from "@/lib/seo";
import { publishedReleases } from "@/modules/releases/queries";

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
          <Card key={r.version} className="overflow-hidden p-0">
            <details open={i === 0} className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 p-5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 sm:p-7">
                <h2 className="whitespace-nowrap text-[22px] font-bold tracking-tight">
                  {r.title}
                </h2>
                <Badge tone="accent" size="md">
                  Beta
                </Badge>
                <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-[13px] text-text-tertiary">
                  {r.date}
                  <ChevronDownIcon
                    size={18}
                    className="transition-transform duration-[var(--dur-2)] ease-spring group-open:rotate-180"
                  />
                </span>
              </summary>
              <div className="space-y-5 px-5 pb-5 sm:px-7 sm:pb-7">
                {r.sections.map((s) => (
                  <div key={s.h}>
                    <h3 className="text-[14px] font-semibold text-text-secondary">{s.h}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {s.items.map((it) => (
                        <li
                          key={it}
                          className="flex gap-2 text-[14px] leading-relaxed text-text-secondary"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
