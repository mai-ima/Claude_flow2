"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryDonut } from "@/components/ui/chart/lazy";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { BudgetGauge } from "@/components/app/budget-gauge";
import type { BudgetInsight } from "@/lib/budget-insight";
import { CategoryIcon, TargetIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { colorOf } from "@/lib/colors";
import { evalAmount } from "@/lib/calc";
import { budgetHealth } from "@/lib/budget-insight";
import { setBudget, deleteBudget } from "../actions";
import { cn } from "@/lib/cn";
import { Fab } from "@/components/ui/fab";
import { Switch } from "@/components/ui/switch";

export interface BudgetItem {
  id: string;
  categoryId: string | null;
  isTotalBudget: boolean;
  name: string;
  icon: string;
  color: string;
  /** 設定した予算額。 */
  amount: number;
  /** 前月から繰り越した額。 */
  carriedOver: number;
  /** 今月使える額（amount + carriedOver）。表示と進捗はこちらを基準にする。 */
  available: number;
  spent: number;
  carryOver: boolean;
}

interface Option {
  id: string;
  name: string;
}

function ProgressBar({ spent, amount, color }: { spent: number; amount: number; color: string }) {
  const ratio = amount > 0 ? spent / amount : 0;
  const pct = Math.min(ratio, 1) * 100;
  const health = budgetHealth(spent, amount);
  const fill =
    health === "over"
      ? "var(--color-expense)"
      : health === "warning"
        ? "var(--color-warning)"
        : colorOf(color);
  return (
    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: fill }}
      />
    </div>
  );
}

function BudgetCard({
  item,
  canEdit,
  currency,
  onEdit,
  onDelete,
}: {
  item: BudgetItem;
  canEdit: boolean;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const remaining = item.available - item.spent;
  const over = remaining < 0;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            item.isTotalBudget ? "bg-accent/10 text-accent" : "bg-surface-2 text-text-secondary",
          )}
        >
          {item.isTotalBudget ? <TargetIcon size={20} /> : <CategoryIcon name={item.icon} size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <button onClick={onEdit} className="block w-full text-left">
            <span className="text-[15px] font-semibold">{item.name}</span>
            {item.carriedOver > 0 && (
              <span className="ml-2 text-[12px] text-income">
                +{formatMoney(item.carriedOver, currency)} 繰り越し
              </span>
            )}
          </button>
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            aria-label="削除"
            className="tap-target grid h-8 w-8 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>
      <ProgressBar spent={item.spent} amount={item.available} color={item.color} />
      <div className="mt-2 flex items-center justify-between text-[13px]">
        <span className="text-text-secondary tabular-nums">
          {formatMoney(item.spent, currency)} / {formatMoney(item.available, currency)}
        </span>
        <span className={cn("font-semibold tabular-nums", over ? "text-expense" : "text-income")}>
          {over ? `${formatMoney(-remaining, currency)} 超過` : `残り ${formatMoney(remaining, currency)}`}
        </span>
      </div>
    </Card>
  );
}

export function BudgetsClient({
  total,
  categories,
  allCategories,
  canEdit,
  currency = "JPY",
  betaFormula = false,
  averages,
  insight,
}: {
  total: BudgetItem | null;
  categories: BudgetItem[];
  allCategories: Option[];
  canEdit: boolean;
  currency?: string;
  /** ベータ: 予算額の数式入力 */
  betaFormula?: boolean;
  averages?: { byCategory: Record<string, number>; total: number };
  /** サーバーで算出した予算の示唆。端末のタイムゾーンで残り日数がずれないように渡す。 */
  insight?: BudgetInsight;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<{
    categoryId: string;
    amount: number;
    carryOver: boolean;
  }>({
    categoryId: "",
    amount: 0,
    carryOver: false,
  });
  // ベータ: 数式入力（"50000-3000" 等）用の生テキスト。
  const [amountText, setAmountText] = useState("");

  function openNew() {
    setForm({ categoryId: "", amount: 0, carryOver: false });
    setAmountText("");
    setError(undefined);
    setSheetOpen(true);
  }
  function openEdit(item: BudgetItem) {
    setForm({
      categoryId: item.categoryId ?? "",
      amount: item.amount,
      carryOver: item.carryOver,
    });
    setAmountText(String(item.amount));
    setError(undefined);
    setSheetOpen(true);
  }
  function applyAmount(v: number) {
    setForm((s) => ({ ...s, amount: v }));
    setAmountText(String(v));
  }
  // 選択中の対象（全体 or カテゴリ）の過去平均。0 以下なら提案しない。
  const suggested = !averages
    ? 0
    : form.categoryId
      ? (averages.byCategory[form.categoryId] ?? 0)
      : averages.total;
  function save() {
    setError(undefined);
    start(async () => {
      const res = await setBudget({
        categoryId: form.categoryId || null,
        amount: form.amount,
        carryOver: form.carryOver,
      });
      if (res.ok) {
        setSheetOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }
  async function remove(id: string) {
    const ok = await confirm({
      title: "この予算を削除しますか？",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteBudget({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("予算を削除しました");
      router.refresh();
    });
  }

  const hasAny = total || categories.length > 0;

  // すでに予算があるカテゴリを除外
  const usedCatIds = new Set(categories.map((c) => c.categoryId));
  const selectableCats = allCategories.filter(
    (c) => !usedCatIds.has(c.id) || c.id === form.categoryId,
  );

  return (
    <div>
      {!hasAny ? (
        <EmptyState
          icon={<TargetIcon size={28} />}
          title="予算を設定しましょう"
          description="全体やカテゴリごとに月の予算を決めると、使いすぎを早めに防げます。"
          action={
            canEdit ? (
              <Button onClick={openNew}>
                <PlusIcon size={18} /> 予算を設定
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {total && (
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => openEdit(total)}
                  className="tap-target flex items-center gap-2.5 text-left"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
                    <TargetIcon size={18} />
                  </span>
                  <span className="text-[15px] font-semibold">全体予算</span>
                </button>
                {canEdit && (
                  <button
                    onClick={() => remove(total.id)}
                    aria-label="削除"
                    className="tap-target grid h-8 w-8 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
              <BudgetGauge
                spent={total.spent}
                amount={total.available}
                currency={currency}
                insight={insight}
              />
            </Card>
          )}

          {categories.length >= 2 && (
            <Card className="p-5">
              <div className="mb-3 text-[14px] font-semibold">カテゴリ予算の配分</div>
              <div className="grid items-center gap-5 sm:grid-cols-2">
                <CategoryDonut
                  data={categories.map((c) => ({ name: c.name, amount: c.available, color: c.color }))}
                />
                <div className="space-y-2">
                  {categories.map((c) => {
                    const health = budgetHealth(c.spent, c.available);
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: colorOf(c.color) }}
                        />
                        <span className="flex-1 truncate text-[13px]">{c.name}</span>
                        <span
                          className={cn(
                            "text-[12px] font-medium tabular-nums",
                            health === "over"
                              ? "text-expense"
                              : health === "warning"
                                ? "text-warning"
                                : "text-text-tertiary",
                          )}
                        >
                          {c.available > 0 ? Math.round((c.spent / c.available) * 100) : 0}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {categories.length > 0 && (
            <div className="px-1 pt-2 text-[13px] font-medium text-text-tertiary">カテゴリ別</div>
          )}
          {categories.map((c) => (
            <BudgetCard
              key={c.id}
              item={c}
              canEdit={canEdit}
              currency={currency}
              onEdit={() => openEdit(c)}
              onDelete={() => remove(c.id)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <Fab onClick={openNew} label="予算を追加" />
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="予算を設定"
        footer={
          // 連打による二重送信（unique 衝突）を防ぐため pending 中は無効化する
          <Button full size="lg" onClick={save} disabled={pending || form.amount <= 0}>
            {pending ? "保存中…" : "保存する"}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="対象">
            <Select
              value={form.categoryId}
              onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="">全体予算</option>
              {selectableCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">前月の残りを繰り越す</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-text-tertiary">
                先月使わなかった分を今月に足します。繰り越すのは1か月分だけで、
                使いすぎた月は繰り越しません。
              </span>
            </span>
            <Switch
              checked={form.carryOver}
              onChange={(v) => setForm((st) => ({ ...st, carryOver: v }))}
              aria-label="前月の残りを繰り越す"
            />
          </div>

          {suggested > 0 && (
            <button
              type="button"
              onClick={() => applyAmount(suggested)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5 text-left transition hover:bg-surface-3"
            >
              <span className="text-[13px] text-text-secondary">
                過去3ヶ月の平均: <b className="tabular-nums text-text-primary">{formatMoney(suggested, currency)}</b>
              </span>
              <span className="text-[13px] font-medium text-accent">適用</span>
            </button>
          )}

          {betaFormula ? (
            <Field label="月の予算額">
              <Input
                inputMode="text"
                value={amountText}
                onChange={(e) => {
                  const text = e.target.value;
                  setAmountText(text);
                  const v = evalAmount(text);
                  setForm((s) => ({ ...s, amount: v !== null && v > 0 ? v : 0 }));
                }}
                placeholder="例: 50000 や 60000-10000"
              />
              <p className="mt-1 text-[12px] text-text-tertiary">
                {(() => {
                  const v = evalAmount(amountText);
                  return v !== null && /[+\-*/×÷]/.test(amountText)
                    ? `= ${formatMoney(v, currency)}`
                    : "＋−×÷ で計算もできます（ベータ）";
                })()}
              </p>
            </Field>
          ) : (
            <Field label="月の予算額">
              <Input
                inputMode="numeric"
                value={form.amount ? String(form.amount) : ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    amount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)),
                  }))
                }
                placeholder="例: 50000"
              />
            </Field>
          )}
          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      </Sheet>
    </div>
  );
}
