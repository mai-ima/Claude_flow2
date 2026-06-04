"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { Input, Select } from "@/components/ui/field";
import { SearchIcon, ChevronRightIcon } from "@/components/icons";

interface Option {
  id: string;
  name: string;
  type?: string;
}

export function TransactionFilters({
  categories,
  paymentMethods,
  current,
}: {
  categories: Option[];
  paymentMethods: Option[];
  current: { q: string; type: string; cat: string; pm: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [keyword, setKeyword] = useState(current.q);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // 絞り込み変更時はページを先頭へ
    router.push(`${pathname}?${next.toString()}`);
  }

  const cats = current.type ? categories.filter((c) => c.type === current.type) : categories;

  return (
    <div className="mb-4 space-y-3">
      <Segmented
        className="w-full"
        value={current.type || "ALL"}
        onChange={(v) => update({ type: v === "ALL" ? "" : v, cat: "" })}
        options={[
          { value: "ALL", label: "すべて" },
          { value: "EXPENSE", label: "支出" },
          { value: "INCOME", label: "収入" },
        ]}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: keyword });
        }}
        className="relative"
      >
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="メモ・カテゴリ・支払いで検索（Enter）"
          className="pl-10"
        />
      </form>
      <div className="grid grid-cols-2 gap-2">
        <Select value={current.cat} onChange={(e) => update({ cat: e.target.value })}>
          <option value="">カテゴリ: すべて</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={current.pm} onChange={(e) => update({ pm: e.target.value })}>
          <option value="">支払い: すべて</option>
          {paymentMethods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (pageCount <= 1) return null;

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="前のページ"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-2 disabled:opacity-30"
      >
        <ChevronRightIcon size={18} className="rotate-180" />
      </button>
      <span className="min-w-[72px] text-center text-[14px] tabular-nums text-text-secondary">
        {page} / {pageCount}
      </span>
      <button
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
        aria-label="次のページ"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-2 disabled:opacity-30"
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
