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
import { IconPicker, ColorPicker } from "@/components/ui/icon-color-picker";

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

const SECTIONS = [
  { type: "EXPENSE", label: "支出のカテゴリ" },
  { type: "INCOME", label: "収入のカテゴリ" },
] as const;

/**
 * 親のすぐ下に子を並べ替える。
 * 作成順のままだと親と子が離れた位置に出て、どれがどれに含まれているのか
 * 画面から読み取れない。
 */
function ordered(list: Cat[]): Cat[] {
  const placed = new Set<string>();
  const out: Cat[] = [];
  for (const parent of list) {
    if (parent.parentId !== null || placed.has(parent.id)) continue;
    out.push(parent);
    placed.add(parent.id);
    for (const child of list) {
      if (child.parentId === parent.id && !placed.has(child.id)) {
        out.push(child);
        placed.add(child.id);
      }
    }
  }
  // 親がアーカイブ中で一覧に出ていない子は上の走査から漏れる。末尾に回して落とさない。
  for (const c of list) if (!placed.has(c.id)) out.push(c);
  return out;
}

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    icon: "tag",
    color: "blue",
    parentId: "",
  });
  const [showArchived, setShowArchived] = useState(false);

  function add() {
    if (!form.name) return;
    start(async () => {
      const res = await createCategory({
        name: form.name,
        type: form.type,
        icon: form.icon,
        color: form.color,
        parentId: form.parentId || undefined,
      });
      if (!res.ok) {
        toast.error(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      setForm({ name: "", type: form.type, icon: "tag", color: "blue", parentId: "" });
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
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;

  /** そのカテゴリを入れられる相手（同じ収支区分で、自分自身と既存のサブカテゴリを除く）。 */
  function parentOptions(c: Cat) {
    return categories.filter(
      (x) =>
        x.id !== c.id &&
        x.type === c.type &&
        x.parentId === null &&
        // アーカイブ済みは新たに選べない。ただし、いま入っている先だけは
        // 選択肢に残す。消すと select の値に合う選択肢が無くなり、
        // 実際は含まれているのに「単独で集計」と表示されてしまう。
        (!x.isArchived || x.id === c.parentId),
    );
  }

  /** 新規追加のときに選べる入れ先。 */
  const addParentOptions = categories.filter(
    (c) => c.type === form.type && c.parentId === null && !c.isArchived,
  );

  function changeParent(id: string, parentId: string | null) {
    start(async () => {
      const res = await setCategoryParent({ id, parentId });
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
        カテゴリは、別のカテゴリの中に入れて「サブカテゴリ」にできます。
        たとえば「外食」を「食費」の中に入れると、分析と予算では食費にまとめて数えられ、
        そのうち外食がいくらだったかも内訳でご確認いただけます。入れ子にできるのは1段までです。
      </p>

      {SECTIONS.map((section) => {
        const rows = ordered(visible.filter((c) => c.type === section.type));
        if (rows.length === 0) return null;
        return (
          <div key={section.type} className="space-y-1.5">
            <h4 className="px-1 text-[12px] font-semibold text-text-tertiary">{section.label}</h4>
            {rows.map((c) => {
              const children = categories.filter((x) => x.parentId === c.id);
              const options = children.length > 0 ? [] : parentOptions(c);
              const parentName = nameOf(c.parentId);
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-xl bg-surface-2 px-3 py-2.5",
                    // 子は一段下げて、親の下にぶら下がっていることを形で示す。
                    c.parentId && "ml-4 border-l-2 border-border-subtle",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                      style={{ background: colorOf(c.color) }}
                    >
                      <CategoryIcon name={c.icon} size={16} />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 break-words text-[14px]",
                        c.isArchived && "text-text-tertiary line-through",
                      )}
                    >
                      {c.name}
                    </span>
                    <button
                      onClick={() => archive(c.id, !c.isArchived)}
                      className="tap-target -my-2 shrink-0 px-2 py-2 text-[12px] font-medium text-accent"
                    >
                      {c.isArchived ? "戻す" : "アーカイブ"}
                    </button>
                  </div>

                  {c.isArchived ? (
                    parentName && (
                      <p className="mt-1.5 text-[12px] text-text-tertiary">
                        「{parentName}」に含まれています
                      </p>
                    )
                  ) : children.length > 0 ? (
                    <p className="mt-1.5 text-[12px] text-text-tertiary">
                      サブカテゴリ{children.length}件（{children.map((x) => x.name).join("、")}）の分も
                      このカテゴリに合算されます
                    </p>
                  ) : options.length > 0 ? (
                    <label className="mt-2 block">
                      <span className="text-[12px] text-text-tertiary">集計のしかた</span>
                      <Select
                        value={c.parentId ?? ""}
                        onChange={(e) => changeParent(c.id, e.target.value || null)}
                        aria-label={`${c.name} の集計のしかた`}
                        className="mt-1"
                      >
                        <option value="">このカテゴリ単独で集計する</option>
                        {options.map((p) => (
                          <option key={p.id} value={p.id}>
                            「{p.name}」に含めて集計する
                          </option>
                        ))}
                      </Select>
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="tap-target flex min-h-11 items-center gap-1.5 text-[13px] text-text-secondary"
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
            onChange={(type) => setForm((s) => ({ ...s, type, parentId: "" }))}
            options={[
              { value: "EXPENSE", label: "支出" },
              { value: "INCOME", label: "収入" },
            ]}
          />
          <Input
            placeholder="カテゴリ名（例: 教育費）"
            aria-label="カテゴリ名"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <ColorPicker
            value={form.color}
            onChange={(color) => setForm((s) => ({ ...s, color }))}
          />
          <IconPicker
            value={form.icon}
            color={form.color}
            onChange={(icon) => setForm((s) => ({ ...s, icon }))}
          />
          {addParentOptions.length > 0 && (
            <label className="block">
              <span className="text-[12px] text-text-tertiary">集計のしかた</span>
              <Select
                value={form.parentId}
                aria-label="集計のしかた"
                className="mt-1"
                onChange={(e) => setForm((s) => ({ ...s, parentId: e.target.value }))}
              >
                <option value="">このカテゴリ単独で集計する</option>
                {addParentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    「{p.name}」に含めて集計する
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="flex items-center gap-2">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
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
