"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CategoryIcon, PlusIcon, RepeatIcon, TrashIcon, EditIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { todayLocal } from "@/lib/date";
import { CYCLE_LABEL, type BillingCycle } from "@/lib/enums";
import { cn } from "@/lib/cn";
import {
  createRecurring,
  updateRecurring,
  deleteRecurring,
  toggleRecurring,
} from "../actions";

type TxnType = "INCOME" | "EXPENSE";

export interface RecurringListItem {
  id: string;
  type: TxnType;
  amount: number;
  cycle: BillingCycle;
  nextRunAt: string; // ISO
  nextRunLabel: string;
  active: boolean;
  memo: string | null;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  paymentMethodId: string | null;
  paymentName: string | null;
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

interface FormValue {
  id?: string;
  type: TxnType;
  amount: number;
  cycle: BillingCycle;
  nextRunAt: string; // yyyy-mm-dd
  categoryId: string;
  paymentMethodId: string;
  memo: string;
}

function todayStr() {
  return todayLocal();
}

export function RecurringClient({
  items,
  categories,
  paymentMethods,
  canEdit,
  currency = "JPY",
}: {
  items: RecurringListItem[];
  categories: Option[];
  paymentMethods: Option[];
  canEdit: boolean;
  currency?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const blank = (): FormValue => ({
    type: "EXPENSE",
    amount: 0,
    cycle: "MONTHLY",
    nextRunAt: todayStr(),
    categoryId: "",
    paymentMethodId: "",
    memo: "",
  });
  const [v, setV] = useState<FormValue>(() => ({ ...blank(), nextRunAt: "" }));

  function openAdd() {
    setV(blank());
    setError(undefined);
    setOpen(true);
  }
  function openEdit(it: RecurringListItem) {
    if (!canEdit) return;
    setV({
      id: it.id,
      type: it.type,
      amount: it.amount,
      cycle: it.cycle,
      nextRunAt: it.nextRunAt.slice(0, 10),
      categoryId: it.categoryId ?? "",
      paymentMethodId: it.paymentMethodId ?? "",
      memo: it.memo ?? "",
    });
    setError(undefined);
    setOpen(true);
  }

  function submit() {
    setError(undefined);
    start(async () => {
      const payload = {
        ...(v.id ? { id: v.id } : {}),
        type: v.type,
        amount: v.amount,
        cycle: v.cycle,
        nextRunAt: new Date(v.nextRunAt),
        categoryId: v.categoryId || null,
        paymentMethodId: v.paymentMethodId || null,
        memo: v.memo || null,
      };
      const res = v.id ? await updateRecurring(payload) : await createRecurring(payload);
      if (res.ok) {
        toast.success(v.id ? "定期取引を更新しました" : "定期取引を追加しました");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onToggle(it: RecurringListItem, active: boolean) {
    start(async () => {
      const res = await toggleRecurring({ id: it.id, active });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function remove(it: RecurringListItem) {
    const ok = await confirm({
      title: "この定期取引を削除しますか？",
      body: "今後の自動記録が停止します。これまでに記録された取引は残ります。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteRecurring({ id: it.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("定期取引を削除しました");
      router.refresh();
    });
  }

  const cats = categories.filter((c) => c.type === v.type);

  return (
    <div className={cn(pending && "opacity-70")}>
      {items.length === 0 ? (
        <EmptyState
          icon={<RepeatIcon size={28} />}
          title="定期取引はまだありません"
          description="家賃やサブスクの引き落としなど、毎月決まった収支を登録すると自動で記録されます。"
        />
      ) : (
        <Card className="overflow-hidden">
          {items.map((it) => (
            <div
              key={it.id}
              className={cn(
                "flex items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0",
                !it.active && "opacity-55",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  it.type === "INCOME" ? "bg-income/12 text-income" : "bg-surface-2 text-text-secondary",
                )}
              >
                <CategoryIcon name={it.categoryIcon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {it.categoryName}
                  {it.memo ? <span className="font-normal text-text-tertiary"> ・ {it.memo}</span> : null}
                </span>
                <span className="block truncate text-[12px] text-text-tertiary">
                  {CYCLE_LABEL[it.cycle]} ・ 次回 {it.nextRunLabel}
                  {it.paymentName ? ` ・ ${it.paymentName}` : ""}
                </span>
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
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={it.active}
                    onChange={(c) => onToggle(it, c)}
                    aria-label={it.active ? "停止する" : "再開する"}
                  />
                  <button
                    onClick={() => openEdit(it)}
                    aria-label="編集"
                    className="grid h-8 w-8 place-items-center rounded-full text-text-tertiary transition hover:bg-surface-2 hover:text-text-primary"
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    onClick={() => remove(it)}
                    aria-label="削除"
                    className="grid h-8 w-8 place-items-center rounded-full text-text-tertiary transition hover:bg-expense/10 hover:text-expense"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {canEdit && (
        <button
          onClick={openAdd}
          aria-label="定期取引を追加"
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg transition duration-[var(--dur-1)] ease-spring hover:bg-accent-hover active:scale-95 md:bottom-8 md:right-8"
        >
          <PlusIcon size={26} />
        </button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={v.id ? "定期取引を編集" : "定期取引を追加"}
        footer={
          <Button full size="lg" onClick={submit} disabled={pending || v.amount <= 0}>
            {pending ? "保存中…" : "保存する"}
          </Button>
        }
      >
        <div className="space-y-4">
          <Segmented<TxnType>
            className="w-full"
            value={v.type}
            onChange={(type) => setV((s) => ({ ...s, type, categoryId: "" }))}
            options={[
              { value: "EXPENSE", label: "支出" },
              { value: "INCOME", label: "収入" },
            ]}
          />

          <div className="rounded-2xl bg-surface-2 px-5 py-6 text-center">
            <input
              inputMode="numeric"
              value={v.amount ? String(v.amount) : ""}
              onChange={(e) =>
                setV((s) => ({
                  ...s,
                  amount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)),
                }))
              }
              placeholder="0"
              aria-label="金額"
              className="w-full bg-transparent text-center text-[40px] font-bold tracking-tight tabular-nums outline-none placeholder:text-text-tertiary"
            />
            <div className="text-[13px] text-text-tertiary">
              {v.type === "EXPENSE" ? "支出" : "収入"}・{formatMoney(v.amount, currency)}
            </div>
          </div>

          <Field label="周期">
            <Select
              value={v.cycle}
              onChange={(e) => setV((s) => ({ ...s, cycle: e.target.value as BillingCycle }))}
            >
              {(Object.keys(CYCLE_LABEL) as BillingCycle[]).map((c) => (
                <option key={c} value={c}>
                  {CYCLE_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="次回の記録日">
            <Input
              type="date"
              value={v.nextRunAt}
              onChange={(e) => setV((s) => ({ ...s, nextRunAt: e.target.value }))}
            />
          </Field>

          <Field label="カテゴリ">
            <Select
              value={v.categoryId}
              onChange={(e) => setV((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="">未分類</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          {paymentMethods.length > 0 && (
            <Field label="支払い方法">
              <Select
                value={v.paymentMethodId}
                onChange={(e) => setV((s) => ({ ...s, paymentMethodId: e.target.value }))}
              >
                <option value="">指定なし</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="メモ（任意）">
            <Textarea
              value={v.memo}
              onChange={(e) => setV((s) => ({ ...s, memo: e.target.value }))}
              placeholder="家賃 など"
            />
          </Field>

          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      </Sheet>
    </div>
  );
}
