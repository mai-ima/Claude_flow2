"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { setAssetSnapshot, deleteAssetSnapshot } from "../actions";

export interface AssetRow {
  id: string;
  monthLabel: string;
  /** input[type=month] に入れる値（yyyy-MM）。 */
  monthValue: string;
  amount: number;
  /** 前月からの増減。前月の記録が無ければ null。 */
  diff: number | null;
  memo: string | null;
}

/**
 * 資産の推移。
 *
 * 口座の自動連携はしない（そのつもりもない）ので、月に一度その時点の
 * 残高を手で書き留める形にする。家計簿の収支は「その月に動いた額」だが、
 * こちらは「いま全部でいくらあるか」。両方を並べないと、
 * 貯まっているのか減っているのかが分からない。
 */
export function AssetTracker({
  rows,
  currency = "JPY",
  canEdit,
  defaultMonth,
}: {
  rows: AssetRow[];
  currency?: string;
  canEdit: boolean;
  /** 記録するときの初期値（今月）。サーバー基準で渡す。 */
  defaultMonth: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ month: defaultMonth, amount: 0, memo: "" });

  const latest = rows.length > 0 ? rows[rows.length - 1] : null;
  const max = Math.max(1, ...rows.map((r) => r.amount));

  function openNew(row?: AssetRow) {
    setForm(
      row
        ? { month: row.monthValue, amount: row.amount, memo: row.memo ?? "" }
        : { month: defaultMonth, amount: 0, memo: "" },
    );
    setOpen(true);
  }

  function save() {
    start(async () => {
      // input[type=month] は "yyyy-MM"。その月の1日として送る。
      const [y, m] = form.month.split("-").map(Number);
      const res = await setAssetSnapshot({
        month: new Date(y, m - 1, 1),
        amount: form.amount,
        memo: form.memo || null,
      });
      if (!res.ok) {
        toast.error(res.fieldErrors?.amount?.[0] ?? res.error);
        return;
      }
      toast.success("資産を記録しました");
      setOpen(false);
      router.refresh();
    });
  }

  async function remove(row: AssetRow) {
    const ok = await confirm({
      title: `${row.monthLabel} の記録を消しますか？`,
      confirmText: "消す",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteAssetSnapshot({ id: row.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>資産の推移</CardTitle>
          {canEdit && (
            <Button size="sm" variant="tinted" onClick={() => openNew()}>
              <PlusIcon size={16} /> 記録する
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-[12px] leading-relaxed text-text-tertiary">
          月に一度、その時点で全部でいくらあるかを書き留めておく欄です。
          口座とはつながっていないので、通帳やアプリを見て手で入れてください。
          家計簿の収支が「その月に動いた額」なのに対して、こちらは「いまの残高」です。
        </p>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-text-tertiary">
            まだ記録がありません。今月の残高を1つ入れると、次の月から増減が出ます。
          </p>
        ) : (
          <>
            {latest && (
              <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3">
                <div className="text-[12px] text-text-tertiary">
                  いちばん新しい記録（{latest.monthLabel}）
                </div>
                <div className="mt-0.5 text-[24px] font-bold tabular-nums">
                  {formatMoney(latest.amount, currency)}
                </div>
                {latest.diff !== null && (
                  <div
                    className={cn(
                      "mt-0.5 text-[13px] tabular-nums",
                      latest.diff > 0 ? "text-income" : latest.diff < 0 ? "text-expense" : "text-text-secondary",
                    )}
                  >
                    前の記録から {latest.diff > 0 ? "+" : ""}
                    {formatMoney(latest.diff, currency)}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              {[...rows].reverse().map((r) => (
                <div key={r.id} className="rounded-xl bg-surface-2 px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[13px] text-text-secondary">
                      {r.monthLabel}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold tabular-nums">
                        {formatMoney(r.amount, currency)}
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${Math.max(2, (r.amount / max) * 100)}%` }}
                        />
                      </span>
                    </span>
                    {r.diff !== null && (
                      <span
                        className={cn(
                          "w-24 shrink-0 text-right text-[12px] tabular-nums",
                          r.diff > 0 ? "text-income" : r.diff < 0 ? "text-expense" : "text-text-tertiary",
                        )}
                      >
                        {r.diff > 0 ? "+" : ""}
                        {formatMoney(r.diff, currency)}
                      </span>
                    )}
                    {canEdit && (
                      <span className="flex shrink-0 items-center">
                        <button
                          onClick={() => openNew(r)}
                          className="px-2 py-2 text-[12px] font-medium text-accent"
                        >
                          直す
                        </button>
                        <button
                          onClick={() => remove(r)}
                          aria-label={`${r.monthLabel} の記録を消す`}
                          className="grid h-9 w-9 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </span>
                    )}
                  </div>
                  {r.memo && (
                    <p className="mt-1 pl-[5.75rem] text-[12px] text-text-tertiary">{r.memo}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="資産を記録"
        footer={
          <Button full size="lg" onClick={save} disabled={pending || !form.month}>
            {pending ? "保存中…" : "保存する"}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
            預金・現金・証券などを合わせた、その月の残高を入れてください。
            同じ月に入れ直すと上書きします。
          </p>
          <Field label="対象の月">
            <Input
              type="month"
              value={form.month}
              onChange={(e) => setForm((s) => ({ ...s, month: e.target.value }))}
            />
          </Field>
          <Field label="残高">
            <Input
              inputMode="numeric"
              value={form.amount ? String(form.amount) : ""}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  amount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)),
                }))
              }
              placeholder="0"
            />
          </Field>
          <Field label="メモ（任意）">
            <Textarea
              value={form.memo}
              onChange={(e) => setForm((s) => ({ ...s, memo: e.target.value }))}
            />
          </Field>
        </div>
      </Sheet>
    </Card>
  );
}
