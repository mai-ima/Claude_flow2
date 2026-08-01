"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { SearchIcon, ChevronRightIcon, StarIcon, XIcon } from "@/components/icons";
import { saveSearch, deleteSavedSearch } from "../actions";

interface Option {
  id: string;
  name: string;
  type?: string;
}

export interface SavedSearchItem {
  id: string;
  name: string;
  query: string;
}

/** 絞り込みを覚えておく先。帳簿ごとに分ける（別の帳簿に持ち越さない）。 */
const filterKey = (ledgerId: string) => `tsumiki.txn-filter.${ledgerId}`;

/** URL のクエリのうち、覚えておく対象。月とページは覚えない。 */
const REMEMBERED = ["q", "type", "cat", "pm"] as const;

export function TransactionFilters({
  categories,
  paymentMethods,
  current,
  saved = [],
  ledgerId,
  remember = true,
}: {
  categories: Option[];
  paymentMethods: Option[];
  current: { q: string; type: string; cat: string; pm: string };
  /** 保存した検索。自分のぶんだけが渡ってくる。 */
  saved?: SavedSearchItem[];
  ledgerId: string;
  /** 前回の絞り込みを復元するか。 */
  remember?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const [keyword, setKeyword] = useState(current.q);
  const [, start] = useTransition();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const active = REMEMBERED.some((k) => current[k]);

  /**
   * いまの絞り込みを覚えておく。他の画面へ移って戻ってきたときに、
   * また同じ条件を入れ直さずに済むようにする。
   *
   * 絞り込みが空のときは「何もしない」。ここで消してはいけない。
   * 空になった理由が「利用者が解除した」のか「これから復元する直前」なのか、
   * この処理からは区別できない。実際、消す実装にしていたときは
   * 復元より先にこちらが走り、覚えたはずの条件が毎回消えていた。
   * 忘れるのは、下の「絞り込みを解除」を押したときだけにする。
   */
  useEffect(() => {
    if (!remember || typeof window === "undefined") return;
    const q = new URLSearchParams();
    for (const k of REMEMBERED) if (current[k]) q.set(k, current[k]);
    if ([...q].length === 0) return;
    try {
      window.localStorage.setItem(filterKey(ledgerId), q.toString());
    } catch {
      // プライベートブラウズなどで保存できないことがある。
      // 覚えられないだけで絞り込み自体は使えるので、黙って諦める。
    }
  }, [current, ledgerId, remember]);

  // 復元は1回だけ。毎回やると、利用者が絞り込みを消しても戻ってしまう。
  const restored = useRef(false);
  useEffect(() => {
    if (!remember || restored.current || typeof window === "undefined") return;
    restored.current = true;
    // すでに何か絞り込んでいるなら触らない（URL のほうが新しい意図）。
    if (active) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(filterKey(ledgerId));
    } catch {
      return;
    }
    if (!stored) return;
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of new URLSearchParams(stored)) next.set(k, v);
    router.replace(`${pathname}?${next.toString()}`);
    // 依存は初回判定に使う値のみ。params を入れると復元後に走り直す。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remember, ledgerId]);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // 絞り込み変更時はページを先頭へ
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams(params.toString());
    for (const k of REMEMBERED) next.delete(k);
    next.delete("page");
    setKeyword("");
    // 覚えていた条件もここで忘れる。解除は明示の操作なので、
    // 次に開いたときに戻ってきてはいけない。
    try {
      window.localStorage.removeItem(filterKey(ledgerId));
    } catch {
      // 保存できない環境では、そもそも覚えていない。
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function applySaved(query: string) {
    const next = new URLSearchParams(params.toString());
    for (const k of REMEMBERED) next.delete(k);
    for (const [k, v] of new URLSearchParams(query)) next.set(k, v);
    next.delete("page");
    setKeyword(new URLSearchParams(query).get("q") ?? "");
    router.push(`${pathname}?${next.toString()}`);
  }

  function save() {
    const q = new URLSearchParams();
    for (const k of REMEMBERED) if (current[k]) q.set(k, current[k]);
    start(async () => {
      const res = await saveSearch({ name: name.trim(), query: q.toString() });
      if (!res.ok) {
        toast.error(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      toast.success("この絞り込みを保存しました");
      setNaming(false);
      setName("");
      router.refresh();
    });
  }

  function removeSaved(id: string) {
    start(async () => {
      const res = await deleteSavedSearch({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
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

      {/* 保存した検索。よく使う条件を1タップで呼び出せるようにする。 */}
      {(saved.length > 0 || active) && (
        <div className="flex flex-wrap items-center gap-2">
          {saved.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center rounded-full border border-border-subtle bg-surface-1 pl-3 text-[13px]"
            >
              <button
                onClick={() => applySaved(s.query)}
                className="min-h-9 py-1 pr-1 font-medium text-text-primary"
              >
                {s.name}
              </button>
              <button
                onClick={() => removeSaved(s.id)}
                aria-label={`「${s.name}」の保存を消す`}
                className="grid h-9 w-8 place-items-center rounded-full text-text-tertiary hover:text-expense"
              >
                <XIcon size={13} />
              </button>
            </span>
          ))}
          {active && (
            <>
              <button
                onClick={() => setNaming((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-border-strong px-3 text-[13px] font-medium text-accent"
              >
                <StarIcon size={13} /> この条件を保存
              </button>
              <button
                onClick={clearAll}
                className="min-h-9 px-2 text-[13px] font-medium text-text-secondary"
              >
                絞り込みを解除
              </button>
            </>
          )}
        </div>
      )}

      {naming && (
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前（例: 今月の食費）"
            aria-label="保存する絞り込みの名前"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) save();
            }}
          />
          <Button size="sm" onClick={save} disabled={!name.trim()}>
            保存
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>
            やめる
          </Button>
        </div>
      )}
    </div>
  );
}

/** リスト表示 / カレンダー表示の切り替え（?view= を更新）。 */
export function ViewSwitcher({ current }: { current: "list" | "calendar" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function change(v: "list" | "calendar") {
    const next = new URLSearchParams(params.toString());
    if (v === "list") next.delete("view");
    else next.set("view", v);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <Segmented
      className="w-full"
      value={current}
      onChange={change}
      options={[
        { value: "list", label: "リスト" },
        { value: "calendar", label: "カレンダー" },
      ]}
    />
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
        className="grid h-11 w-11 place-items-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-2 disabled:opacity-30"
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
        className="grid h-11 w-11 place-items-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-2 disabled:opacity-30"
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
