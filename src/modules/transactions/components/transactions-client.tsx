"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TransactionSheet, type TxnFormValue } from "./transaction-sheet";
import {
  deleteTransaction,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
} from "../actions";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SwipeRow, type SwipeAction } from "@/components/ui/swipe-row";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CategoryIcon, WalletIcon, TrashIcon, CopyIcon, CheckIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { todayLocal } from "@/lib/date";
import { cn } from "@/lib/cn";
import { Fab } from "@/components/ui/fab";

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
  betaAmountPad = false,
  betaDuplicate = false,
  betaHaptics = false,
  today,
}: {
  items: TxnListItem[];
  categories: Option[];
  paymentMethods: Option[];
  canEdit: boolean;
  showOwner?: boolean;
  currency?: string;
  /** ベータ: 電卓キーパッド */
  betaAmountPad?: boolean;
  /** ベータ: スワイプで複製 */
  betaDuplicate?: boolean;
  /** ベータ: 触覚フィードバック */
  betaHaptics?: boolean;
  /** サーバー基準の今日(yyyy-MM-dd)。 */
  today?: string;
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

  // 削除は往復を待たずに行を消す。トランジション終了時に props の items へ戻るため、
  // 失敗した場合は自動的に元へ復帰する（別途の巻き戻し処理は不要）。
  const [visibleItems, hideOptimistically] = useOptimistic(
    items,
    (state: TxnListItem[], removedIds: string[]) =>
      state.filter((it) => !removedIds.includes(it.id)),
  );

  // 一括操作（選択モード）
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCat, setBulkCat] = useState("");
  const [bulkPm, setBulkPm] = useState("");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }
  function selectAll() {
    setSelected(new Set(visibleItems.map((it) => it.id)));
  }

  async function bulkRemove() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `${ids.length}件の記録を削除しますか？`,
      body: "削除すると元に戻せません。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      hideOptimistically(ids);
      const res = await bulkDeleteTransactions({ ids });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data.count}件を削除しました`);
      exitSelect();
      router.refresh();
    });
  }

  function bulkApply() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!bulkCat && !bulkPm) {
      setBulkOpen(false);
      return;
    }
    start(async () => {
      const res = await bulkUpdateTransactions({
        ids,
        ...(bulkCat ? { categoryId: bulkCat } : {}),
        ...(bulkPm ? { paymentMethodId: bulkPm } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data.count}件を更新しました`);
      setBulkOpen(false);
      setBulkCat("");
      setBulkPm("");
      exitSelect();
      router.refresh();
    });
  }

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
      categoryName: it.categoryName,
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
      occurredAt: today ?? todayLocal(),
      categoryId: it.categoryId ?? "",
      categoryName: it.categoryName,
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
      hideOptimistically([id]);
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
  for (const it of visibleItems) {
    const arr = groups.get(it.dateLabel) ?? [];
    arr.push(it);
    groups.set(it.dateLabel, arr);
  }

  return (
    <div className={cn(pending && "opacity-70")}>
      {canEdit && visibleItems.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          {selectMode ? (
            <>
              <button
                onClick={selectAll}
                className="text-[13px] font-medium text-accent"
              >
                すべて選択（{visibleItems.length}）
              </button>
              <button
                onClick={exitSelect}
                className="text-[13px] font-medium text-text-secondary"
              >
                完了
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition hover:bg-surface-3"
            >
              <CheckIcon size={15} />
              選択
            </button>
          )}
        </div>
      )}

      {visibleItems.length === 0 ? (
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

                  // 選択モード: チェックボックス付きの行。タップで選択をトグル。
                  if (selectMode && canEdit) {
                    const checked = selected.has(it.id);
                    return (
                      <button
                        key={it.id}
                        onClick={() => toggleSelect(it.id)}
                        className={cn(
                          "flex w-full items-center gap-3 border-t border-border-subtle px-4 py-3 text-left first:border-t-0",
                          checked && "bg-accent/5",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
                            checked
                              ? "border-accent bg-accent-solid text-white"
                              : "border-border-strong text-transparent",
                          )}
                        >
                          <CheckIcon size={14} />
                        </span>
                        {icon}
                        {label}
                        {amount}
                      </button>
                    );
                  }

                  // 編集可能なら左スワイプ操作（v1.2.4 で全員に正式化）。
                  // ベータ時のみ「複製」アクションとハプティックを追加。
                  if (canEdit) {
                    const actions: SwipeAction[] = [
                      ...(betaDuplicate
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
                        haptics={betaHaptics}
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
                            className="hidden h-8 w-8 place-items-center rounded-full text-text-tertiary opacity-0 transition hover:bg-expense/10 hover:text-expense group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:grid"
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

      {canEdit && !selectMode && (
        <Fab onClick={openAdd} label="記録を追加" />
      )}

      {/* 一括操作バー（選択モードで選択がある時のみ） */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-border-subtle bg-surface-1 p-2 shadow-lg">
            <span className="px-2 text-[13px] font-medium tabular-nums">{selected.size}件</span>
            <Button
              variant="gray"
              size="sm"
              className="flex-1"
              onClick={() => setBulkOpen(true)}
              disabled={pending}
            >
              変更
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={bulkRemove}
              disabled={pending}
            >
              <TrashIcon size={16} />
              削除
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`${selected.size}件をまとめて変更`}
        footer={
          <Button full size="lg" onClick={bulkApply} disabled={pending || (!bulkCat && !bulkPm)}>
            {pending ? "更新中…" : "変更を適用"}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-text-secondary">
            選択した記録のカテゴリ・支払い方法をまとめて変更します。空欄の項目は変更しません。
          </p>
          <Field label="カテゴリ">
            <Select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)}>
              <option value="">変更しない</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {paymentMethods.length > 0 && (
            <Field label="支払い方法">
              <Select value={bulkPm} onChange={(e) => setBulkPm(e.target.value)}>
                <option value="">変更しない</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Sheet>

      <TransactionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        paymentMethods={paymentMethods}
        initial={editing}
        currency={currency}
        beta={betaAmountPad}
        today={today}
      />
    </div>
  );
}
