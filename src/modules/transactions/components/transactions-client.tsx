"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TransactionSheet, type TxnFormValue } from "./transaction-sheet";
import { deleteTransaction } from "../actions";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SwipeRow, type SwipeAction } from "@/components/ui/swipe-row";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CategoryIcon, PlusIcon, WalletIcon, TrashIcon, CopyIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

export interface TxnListItem {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  occurredAt: string;
  dateLabel: string;
  memo: string | null;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  paymentMethodId: string | null;
  paymentName: string | null;
  ownerName: string | null;
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

export function TransactionsClient({
  items,
  categories,
  paymentMethods,
  canEdit,
  showOwner = false,
  currency = "JPY",
  beta = false,
}: {
  items: TxnListItem[];
  categories: Option[];
  paymentMethods: Option[];
  canEdit: boolean;
  showOwner?: boolean;
  currency?: string;
  beta?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [sheetOpen, setSheetOpen] = useState(
    () => canEdit && searchParams.get("new") === "1",
  );
  const [editing, setEditing] = useState<TxnFormValue | undefined>();
  const [pending, start] = useTransition();

  function openAdd() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(it: TxnListItem) {
    if (!canEdit) return;
    setEditing({
      id: it.id,
      type: it.type,
      amount: it.amount,
      occurredAt: it.occurredAt.slice(0, 10),
      categoryId: it.categoryId ?? "",
      paymentMethodId: it.paymentMethodId ?? "",
      memo: it.memo ?? "",
    });
    setSheetOpen(true);
  }
  // ベータ: 同じ内容を今日の新規記録として複製（id を持たせず追加モードで開く）
  function openDuplicate(it: TxnListItem) {
    if (!canEdit) return;
    setEditing({
      type: it.type,
      amount: it.amount,
      occurredAt: new Date().toISOString().slice(0, 10),
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

  // 日付ごとにグループ化
  const groups = new Map<string, TxnListItem[]>();
  for (const it of items) {
    const arr = groups.get(it.dateLabel) ?? [];
    arr.push(it);
    groups.set(it.dateLabel, arr);
  }

  return (
    <div className={cn(pending && "opacity-70")}>
      {items.length === 0 ? (
        <EmptyState
          icon={<WalletIcon size={28} />}
          title="まだ記録がありません"
          description="右下のボタンから、最初の収支を追加しましょう。"
        />
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([date, list]) => (
            <div key={date}>
              <div className="mb-1.5 px-1 text-[13px] font-medium text-text-tertiary">{date}</div>
              <Card className="overflow-hidden">
                {list.map((it) => {
                  const icon = (
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
                  );
                  const label = (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {it.categoryName}
                        {it.memo ? (
                          <span className="font-normal text-text-tertiary"> ・ {it.memo}</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[12px] text-text-tertiary">
                        {it.paymentName ?? "—"}
                        {showOwner && it.ownerName ? ` ・ ${it.ownerName}` : ""}
                      </span>
                    </span>
                  );
                  const amount = (
                    <span
                      className={cn(
                        "shrink-0 text-[15px] font-semibold tabular-nums",
                        it.type === "INCOME" ? "text-income" : "text-text-primary",
                      )}
                    >
                      {it.type === "INCOME" ? "+" : "−"}
                      {formatMoney(it.amount, currency)}
                    </span>
                  );

                  // 編集可能なら左スワイプ操作（v1.2.4 で全員に正式化）。
                  // ベータ時のみ「複製」アクションとハプティックを追加。
                  if (canEdit) {
                    const actions: SwipeAction[] = [
                      ...(beta
                        ? [
                            {
                              label: "複製",
                              tone: "duplicate" as const,
                              icon: <CopyIcon size={16} />,
                              onClick: () => openDuplicate(it),
                            },
                          ]
                        : []),
                      { label: "編集", tone: "edit", onClick: () => openEdit(it) },
                      {
                        label: "削除",
                        tone: "delete",
                        icon: <TrashIcon size={16} />,
                        onClick: () => remove(it.id),
                      },
                    ];
                    return (
                      <SwipeRow
                        key={it.id}
                        className="border-t border-border-subtle first:border-t-0"
                        onTap={() => openEdit(it)}
                        actions={actions}
                        haptics={beta}
                      >
                        <div className="group flex items-center gap-3 px-4 py-3">
                          {icon}
                          {label}
                          {amount}
                          {/* デスクトップ向けの即時削除（タッチではスワイプを使用） */}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => remove(it.id)}
                            aria-label="削除"
                            className="hidden h-8 w-8 place-items-center rounded-full text-text-tertiary opacity-0 transition hover:bg-expense/10 hover:text-expense group-hover:opacity-100 md:grid"
                          >
                            <TrashIcon size={17} />
                          </button>
                        </div>
                      </SwipeRow>
                    );
                  }

                  // 閲覧のみ（共有メンバー等）。
                  return (
                    <div
                      key={it.id}
                      className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0"
                    >
                      {icon}
                      {label}
                      {amount}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <button
          onClick={openAdd}
          aria-label="記録を追加"
          className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent-hover active:scale-95 md:bottom-8 md:right-8"
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
