"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronRightIcon } from "@/components/icons";

export function MonthSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [y, m] = current.split("-").map(Number);

  function go(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    const param = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`${pathname}?m=${param}`);
  }

  const isCurrent = (() => {
    const now = new Date();
    return now.getFullYear() === y && now.getMonth() + 1 === m;
  })();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border-subtle bg-surface-1 p-1">
      <button
        onClick={() => go(-1)}
        aria-label="前の月"
        className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-surface-2"
      >
        <ChevronRightIcon size={18} className="rotate-180" />
      </button>
      <span className="min-w-[88px] text-center text-[14px] font-semibold tabular-nums">
        {y}年{m}月
      </span>
      <button
        onClick={() => go(1)}
        aria-label="次の月"
        disabled={isCurrent}
        className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
