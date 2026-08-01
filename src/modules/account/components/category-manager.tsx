"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { CategoryIcon, PlusIcon, ArchiveIcon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { colorOf } from "@/lib/colors";
import { createCategory, toggleArchiveCategory, setCategoryParent } from "../actions";
import { cn } from "@/lib/cn";

interface Cat {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  isArchived: boolean;
  /** 親カテゴリ。null なら自分が親（またはサブカテゴリを持たない）。 */
  parentId: string | null;
}

const ICONS = ["tag", "food", "cart", "home", "bolt", "train", "wifi", "play", "heart", "gift", "briefcase", "music", "cloud", "sparkles", "card", "wallet"];
const COLORS = ["blue", "teal", "green", "mint", "yellow", "orange", "pink", "red", "purple", "indigo", "cyan", "gray"];

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", type: "EXPENSE" as "INCOME" | "EXPENSE", icon: "tag", color: "blue" });
  const [showArchived, setShowArchived] = useState(false);

  function add() {
    if (!form.name) return;
    start(async () => {
      const res = await createCategory(form);
      if (!res.ok) {
        toast.error(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      setForm({ name: "", type: form.type, icon: "tag", color: "blue" });
      setAdding(false);
      router.refresh();
    });
  }
  function archive(id: string, archived: boolean) {
    start(async () => {
      const res = await toggleArchiveCategory({ id, archived });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  const visible = categories.filter((c) => showArchived || !c.isArchived);

  /** サブカテゴリにできる相手（同じ収支区分で、自分自身と既存のサブカテゴリを除く）。 */
  function parentOptions(c: Cat) {
    const hasChildren = categories.some((x) => x.parentId === c.id);
    if (hasChildren) return [];
    return categories.filter(
      (x) => x.id !== c.id && x.type === c.type && x.parentId === null && !x.isArchived,
    );
  }

  function changeParent(id: string, parentId: string | null) {
    start(async () => {
      const res = await setCategoryParent({ id, parentId });
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {visible.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-white"
              style={{ background: colorOf(c.color) }}
            >
              <CategoryIcon name={c.icon} size={16} />
            </span>
            <span className={cn("flex-1 text-[14px]", c.isArchived && "text-text-tertiary line-through")}>
              {c.parentId && <span className="mr-1 text-text-tertiary">└</span>}
              {c.name}
              <span className="ml-2 text-[11px] text-text-tertiary">
                {c.type === "INCOME" ? "収入" : "支出"}
              </span>
            </span>
            {!c.isArchived && parentOptions(c).length > 0 && (
              <Select
                value={c.parentId ?? ""}
                onChange={(e) => changeParent(c.id, e.target.value || null)}
                aria-label={`${c.name} のまとめ先`}
                className="h-9 w-32 text-[13px]"
              >
                <option value="">まとめない</option>
                {parentOptions(c).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}の下
                  </option>
                ))}
              </Select>
            )}
            <button
              onClick={() => archive(c.id, !c.isArchived)}
              className="text-[12px] font-medium text-accent"
            >
              {c.isArchived ? "戻す" : "アーカイブ"}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] text-text-secondary"
        >
          <ArchiveIcon size={15} />
          {showArchived ? "アーカイブを隠す" : "アーカイブを表示"}
        </button>
      </div>

      {adding ? (
        <div className="space-y-3 rounded-xl border border-border-subtle p-3">
          <Segmented<"INCOME" | "EXPENSE">
            className="w-full"
            value={form.type}
            onChange={(type) => setForm((s) => ({ ...s, type }))}
            options={[
              { value: "EXPENSE", label: "支出" },
              { value: "INCOME", label: "収入" },
            ]}
          />
          <Input
            placeholder="カテゴリ名（例: 教育費）"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.icon} onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))}>
              {ICONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
            <Select value={form.color} onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))}>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-white"
              style={{ background: colorOf(form.color) }}
            >
              <CategoryIcon name={form.icon} size={18} />
            </span>
            <Button size="sm" onClick={add} disabled={!form.name}>
              追加
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="tinted" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon size={16} /> カテゴリを追加
        </Button>
      )}
    </div>
  );
}
