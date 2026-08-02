"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon } from "@/components/icons";
import type { ReleaseSection } from "../queries";

export interface ReleaseCardProps {
  version: string;
  title: string;
  date: string;
  /** 詳細版。 */
  sections: ReleaseSection[];
  /** 通常版。無い版は切り替えを出さず、詳細版だけを表示する。 */
  summary: ReleaseSection[] | null;
  /** 一覧の先頭だけ開いた状態にする。 */
  defaultOpen?: boolean;
}

function SectionList({ sections }: { sections: ReleaseSection[] }) {
  return (
    <div className="space-y-5">
      {sections.map((s) => (
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
  );
}

export function ReleaseCard({
  title,
  date,
  sections,
  summary,
  defaultOpen = false,
}: ReleaseCardProps) {
  // 既定は通常版。詳しく知りたい人だけが切り替える。
  const [detailed, setDetailed] = useState(false);
  const shown = summary && !detailed ? summary : sections;

  return (
    <Card className="overflow-hidden p-0">
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 p-5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 sm:p-7">
          <h2 className="whitespace-nowrap text-[22px] font-bold tracking-tight">{title}</h2>
          <Badge tone="accent" size="md">
            Beta
          </Badge>
          <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-[13px] text-text-tertiary">
            {date}
            <ChevronDownIcon
              size={18}
              className="transition-transform duration-[var(--dur-2)] ease-spring group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="space-y-5 px-5 pb-5 sm:px-7 sm:pb-7">
          {summary && (
            <div
              role="group"
              aria-label="表示の詳しさ"
              className="inline-flex rounded-xl border border-border-subtle bg-surface-2 p-0.5"
            >
              {(
                [
                  ["通常版", false],
                  ["詳細版", true],
                ] as const
              ).map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={detailed === value}
                  onClick={() => setDetailed(value)}
                  className={
                    "tap-target min-h-9 rounded-[10px] px-3.5 text-[13px] font-medium transition duration-[var(--dur-1)] ease-spring " +
                    (detailed === value
                      ? "bg-surface-1 text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <SectionList sections={shown} />
        </div>
      </details>
    </Card>
  );
}
