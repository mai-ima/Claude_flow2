"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { colorOf } from "@/lib/colors";
import { ColorPicker } from "@/components/ui/icon-color-picker";
import { createTag, updateTag, deleteTag } from "../actions";

export interface TagItem {
  id: string;
  name: string;
  color: string;
  count: number;
}

/**
 * タグの管理。
 *
 * カテゴリと違い、1件の記録に何枚でも貼れる。旅行や引っ越しのように、
 * カテゴリをまたいで後から集計したいときに使う。
 */
export function TagManager({ tags }: { tags: TagItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", color: "blue" });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", color: "gray" });

  function add() {
    if (!form.name.trim()) return;
    start(async () => {
      const res = await createTag(form);
      if (!res.ok) {
        toast.error(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      setForm({ name: "", color: "blue" });
      setAdding(false);
      router.refresh();
    });
  }

  function save(id: string) {
    start(async () => {
      const res = await updateTag({ id, ...edit });
      if (!res.ok) {
        toast.error(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  async function remove(t: TagItem) {
    const ok = await confirm({
      title: `「${t.name}」を削除しますか？`,
      body:
        t.count > 0
          ? `${t.count}件の記録に貼ってあります。記録そのものは残り、このタグだけが外れます。`
          : "どの記録にも貼っていません。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteTag({ id: t.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
        タグは、カテゴリとは別に記録へ貼る目印です。1件の記録に何枚でも貼れます。
        「旅行2026」「引っ越し」のように、カテゴリをまたいで後から金額を集めたいときにお使いください。
      </p>

      {tags.length > 0 && (
        <div className="space-y-1.5">
          {tags.map((t) => (
            <div key={t.id} className="rounded-xl bg-surface-2 px-3 py-2.5">
              {editing === t.id ? (
                <div className="space-y-2">
                  <Input
                    value={edit.name}
                    aria-label="タグの名前"
                    onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))}
                  />
                  <ColorPicker
                    label="タグの色"
                    value={edit.color}
                    onChange={(color) => setEdit((s) => ({ ...s, color }))}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => save(t.id)} disabled={!edit.name.trim()}>
                      保存
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      やめる
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: colorOf(t.color) }}
                  />
                  <span className="min-w-0 flex-1 break-words text-[14px]">
                    {t.name}
                    <span className="ml-2 text-[11px] text-text-tertiary">{t.count}件</span>
                  </span>
                  <button
                    onClick={() => {
                      setEditing(t.id);
                      setEdit({ name: t.name, color: t.color });
                    }}
                    className="tap-target -my-2 px-2 py-2 text-[12px] font-medium text-accent"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => remove(t)}
                    aria-label={`${t.name} を削除`}
                    className="tap-target grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-3 rounded-xl border border-border-subtle p-3">
          <Input
            placeholder="タグ名（例: 旅行2026）"
            aria-label="タグ名"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && form.name.trim()) add();
            }}
          />
          <ColorPicker
            value={form.color}
            onChange={(color) => setForm((s) => ({ ...s, color }))}
          />
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-6 w-6 shrink-0 rounded-full"
              style={{ background: colorOf(form.color) }}
            />
            <Button size="sm" onClick={add} disabled={!form.name.trim()}>
              追加
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="tinted" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon size={16} /> タグを追加
        </Button>
      )}
    </div>
  );
}
