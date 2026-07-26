"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TransactionSheet, type TxnFormValue } from "./transaction-sheet";
import { deleteTransaction } from "../actions";
import type { TxnListItem } from "./transactions-client";
import { Card } from "@/components/ui/card";
import { SwipeRow, type SwipeAction } from "@/components/ui/swipe-row";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CategoryIcon, PlusIcon, TrashIcon, EditIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { buildCalendarWeeks, toDateInput, formatDate, parseDateInput } from "@/lib/date";
import { cn } from "@/lib/cn";

export interface DayTotalItem {
  date: string;
  income: number;
  expense: number;
  count: number;
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 金額を日セル内に収めるための短縮表記（1.2万 など）。 */
function compact(amount: number): string {
  // 丸めてから桁を判定する。先に桁で分岐すると 9,950 が「10千」になる。
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${man >= 10 ? Math.round(man) : Math.round(man * 10) / 10}万`;
  }
  if (amount >= 1000) {
    const sen = Math.round(amount / 100) / 10;
    // 9,950 → 10.0千 になるケースは「1万」へ繰り上げる。
    if (sen >= 10) return "1万";
    return `${sen}千`;
  }
  return String(amount);
}

export function CalendarClient({
  month,
  days,
  items,
  categories,
  paymentMethods,
  canEdit,
  currency = "JPY",
  beta = false,
  todayKey,
}: {
  /** 表示対象月（yyyy-MM） */
  month: string;
  /**
   * 今日の日付（yyyy-MM-dd）。サーバーで確定した値を受け取る。
   * クライアントで `new Date()` から求めると、サーバー(UTC)と端末(JST)で
   * 日付が食い違い、ハイドレーション不一致（今日の丸の位置・初期選択日のずれ）
   * が起きるため。
   */
  todayKey: string;
  days: DayTotalItem[];
  items: TxnListItem[];
  categories: Option[];
  paymentMethods: Option[];
  canEdit: boolean;
  currency?: string;
  beta?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TxnFormValue | undefined>();

  // month は yyyy-MM。ローカルタイムで月初を生成する（UTC 解釈による前日ずれを回避）。
  const [y, m] = month.split("-").map(Number);
  const monthDate = new Date(y, m - 1, 1);
  const weeks = buildCalendarWeeks(monthDate);

  // 初期選択日: 今日が当月ならば今日、そうでなければ月初。
  const firstKey = toDateInput(monthDate);
  const isCurrentMonth = todayKey.slice(0, 7) === month;
  const [selected, setSelected] = useState(isCurrentMonth ? todayKey : firstKey);

  const totalsByDate = new Map(days.map((d) => [d.date, d]));
  const itemsByDate = new Map<string, TxnListItem[]>();
  for (const it of items) {
    const key = toDateInput(new Date(it.occurredAt));
    const arr = itemsByDate.get(key) ?? [];
    arr.push(it);
    itemsByDate.set(key, arr);
  }

  const monthIncome = days.reduce((s, d) => s + d.income, 0);
  const monthExpense = days.reduce((s, d) => s + d.expense, 0);
  const selectedItems = itemsByDate.get(selected) ?? [];

  function openAdd() {
    setEditing({
      type: "EXPENSE",
      amount: 0,
      occurredAt: selected,
      categoryId: "",
      paymentMethodId: "",
      memo: "",
    });
    setSheetOpen(true);
  }

  function openEdit(it: TxnListItem) {
    setEditing({
      id: it.id,
      type: it.type,
      amount: it.amount,
      occurredAt: toDateInput(new Date(it.occurredAt)),
      categoryId: it.categoryId ?? "",
      paymentMethodId: it.paymentMethodId ?? "",
      memo: it.memo ?? "",
    });
    setSheetOpen(true);
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "この記録を削除しますか？",
      body: "削除すると元に戻せません。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteTransaction({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("記録を削除しました");
      router.refresh();
    });
  }

  return (
    <div className={cn(pending && "opacity-70")}>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border-subtle">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={cn(
                "py-2 text-center text-[12px] font-medium",
                i === 0 && "text-expense",
                i === 6 && "text-accent",
                i > 0 && i < 6 && "text-text-tertiary",
              )}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const key = toDateInput(day);
            const inMonth = key.slice(0, 7) === month;
            const t = totalsByDate.get(key);
            const isToday = key === todayKey;
            const isSelected = key === selected;
            const dow = day.getDay();

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={`${formatDate(day, "M月d日")}を表示`}
                aria-current={isSelected ? "date" : undefined}
                className={cn(
                  "min-h-[60px] min-w-0 border-b border-r border-border-subtle p-1 text-left align-top transition-colors duration-[var(--dur-1)] ease-spring",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
                  isSelected ? "bg-accent/10" : "hover:bg-surface-2",
                  !inMonth && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-[13px] tabular-nums",
                    isToday && "bg-accent font-semibold text-white",
                    !isToday && dow === 0 && "text-expense",
                    !isToday && dow === 6 && "text-accent",
                    !isToday && dow > 0 && dow < 6 && "text-text-primary",
                  )}
                >
                  {day.getDate()}
                </span>
                {t && (
                  <span className="mt-0.5 block space-y-px">
                    {t.income > 0 && (
                      <span className="block truncate text-[10px] font-medium tabular-nums text-income">
                        {compact(t.income)}
                      </span>
                    )}
                    {t.expense > 0 && (
                      <span className="block truncate text-[10px] font-medium tabular-nums text-expense">
                        {compact(t.expense)}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 divide-x divide-border-subtle border-t border-border-subtle">
          <div className="px-3 py-2.5 text-center">
            <div className="text-[11px] text-text-tertiary">収入</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-income">
              {formatMoney(monthIncome, currency)}
            </div>
          </div>
          <div className="px-3 py-2.5 text-center">
            <div className="text-[11px] text-text-tertiary">支出</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-expense">
              {formatMoney(monthExpense, currency)}
            </div>
          </div>
          <div className="px-3 py-2.5 text-center">
            <div className="text-[11px] text-text-tertiary">合計</div>
            <div
              className={cn(
                "mt-0.5 text-[15px] font-semibold tabular-nums",
                monthIncome - monthExpense >= 0 ? "text-income" : "text-expense",
              )}
            >
              {formatMoney(monthIncome - monthExpense, currency)}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[13px] font-medium text-text-tertiary">
            {formatDate(parseDateInput(selected), "M月d日(E)")}
          </span>
          {canEdit && (
            <button
              onClick={openAdd}
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-accent transition hover:bg-accent/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <PlusIcon size={15} />
              この日に追加
            </button>
          )}
        </div>

        {selectedItems.length === 0 ? (
          <Card className="px-4 py-8 text-center text-[14px] text-text-tertiary">
            この日の記録はありません。
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {selectedItems.map((it) => {
              const actions: SwipeAction[] = canEdit
                ? [
                    {
                      label: "編集",
                      icon: <EditIcon size={18} />,
                      tone: "edit",
                      onClick: () => openEdit(it),
                    },
                    {
                      label: "削除",
                      icon: <TrashIcon size={18} />,
                      tone: "delete",
                      onClick: () => remove(it.id),
                    },
                  ]
                : [];

              return (
                <SwipeRow
                  key={it.id}
                  className="border-t border-border-subtle first:border-t-0"
                  onTap={canEdit ? () => openEdit(it) : undefined}
                  actions={actions}
                  haptics={beta}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                        it.type === "INCOME"
                          ? "bg-income/12 text-income"
                          : "bg-surface-2 text-text-secondary",
                      )}
                    >
                      <CategoryIcon name={it.categoryIcon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {it.categoryName}
                        {it.memo ? (
                          <span className="text-text-tertiary"> ・ {it.memo}</span>
                        ) : null}
                      </span>
                      {it.paymentName && (
                        <span className="block truncate text-[12px] text-text-tertiary">
                          {it.paymentName}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[15px] font-semibold tabular-nums",
                        it.type === "INCOME" ? "text-income" : "text-text-primary",
                      )}
                    >
                      {it.type === "INCOME" ? "+" : "−"}
                      {formatMoney(it.amount, currency)}
                    </span>
                  </div>
                </SwipeRow>
              );
            })}
          </Card>
        )}
      </div>

      {/* リスト表示と同じ位置に常設の追加ボタン。選択中の日付で開く。 */}
      {canEdit && (
        <button
          onClick={openAdd}
          aria-label="記録を追加"
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg transition duration-[var(--dur-1)] ease-spring hover:bg-accent-hover active:scale-95 md:bottom-8 md:right-8"
        >
          <PlusIcon size={26} />
        </button>
      )}

      <TransactionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        paymentMethods={paymentMethods}
        initial={editing}
        currency={currency}
        beta={beta}
      />
    </div>
  );
}
