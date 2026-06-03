"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SubscriptionSheet, type SubFormValue } from "./subscription-sheet";
import { SubscriptionReview, type ReviewItem } from "./subscription-review";
import { markUsed, deleteSubscription } from "../actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  CategoryIcon,
  PlusIcon,
  RepeatIcon,
  CheckIcon,
  TrashIcon,
  SparklesIcon,
  CardIcon,
} from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { gradientOf } from "@/lib/colors";
import { cn } from "@/lib/cn";

export interface SubItem {
  id: string;
  name: string;
  icon: string;
  monthly: number;
  yearly: number;
  cycleLabel: string;
  statusLabel: string;
  status: string;
  nextRenewalLabel: string;
  daysUntil: number;
  categoryName: string;
  paymentName: string | null;
  wasteLevel: "none" | "watch" | "waste";
  wasteMessage: string | null;
  daysSinceUsed: number | null;
  cancelUrl: string | null;
  cancelSteps: string[];
  edit: SubFormValue;
}

export interface StackGroup {
  name: string;
  color: string;
  monthly: number;
  subs: { id: string; name: string; icon: string; label: string }[];
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

export interface CalendarMonth {
  label: string;
  total: number;
  count: number;
}

export function SubscriptionsClient({
  items,
  stack,
  totals,
  calendar,
  currency = "JPY",
  categories,
  paymentMethods,
  canEdit,
  isPro,
}: {
  items: SubItem[];
  stack: { groups: StackGroup[]; unassigned: StackGroup | null };
  totals: { monthly: number; yearly: number; count: number };
  calendar: CalendarMonth[];
  currency?: string;
  categories: Option[];
  paymentMethods: Option[];
  canEdit: boolean;
  isPro: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState<"list" | "stack" | "calendar">("list");
  const [sortBy, setSortBy] = useState<"renewal" | "amount" | "name">("renewal");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "CANCELED">("ALL");
  const [sheetOpen, setSheetOpen] = useState(
    () => canEdit && searchParams.get("new") === "1",
  );
  const [editing, setEditing] = useState<SubFormValue | undefined>();
  const [reviewing, setReviewing] = useState(false);
  const [, start] = useTransition();

  function openAdd() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(it: SubItem) {
    if (!canEdit) return;
    setEditing(it.edit);
    setSheetOpen(true);
  }
  function used(id: string) {
    start(async () => {
      await markUsed({ id });
      router.refresh();
    });
  }
  async function remove(id: string) {
    const ok = await confirm({
      title: "このサブスクを削除しますか？",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteSubscription({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("サブスクを削除しました");
      router.refresh();
    });
  }

  const listItems = items
    .filter((it) => statusFilter === "ALL" || it.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "amount") return b.monthly - a.monthly;
      if (sortBy === "name") return a.name.localeCompare(b.name, "ja");
      return a.daysUntil - b.daysUntil; // renewal（近い順）
    });

  const reviewItems: ReviewItem[] = items
    .filter((it) => it.status === "ACTIVE" || it.status === "TRIAL")
    .map((it) => ({
      id: it.id,
      name: it.name,
      icon: it.icon,
      amount: it.monthly,
      yearly: it.yearly,
      daysSinceUsed: it.daysSinceUsed,
      cancelUrl: it.cancelUrl,
      cancelSteps: it.cancelSteps,
    }));

  return (
    <div>
      {/* totals */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">月額合計</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums">{formatMoney(totals.monthly, currency)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">年額換算</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums">{formatMoney(totals.yearly, currency)}</div>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <div className="text-[12px] text-text-tertiary">登録数</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums">{totals.count}件</div>
        </Card>
      </div>

      {/* review CTA */}
      <Card className="mb-5 flex items-center gap-3 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pod/12 text-pod">
          <SparklesIcon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            サブスク・レビュー
            {!isPro && <Badge tone="pod" size="sm">PRO</Badge>}
          </div>
          <p className="text-[13px] text-text-secondary">1件ずつ仕分けして、固定費を見直す。</p>
        </div>
        {isPro ? (
          <Button size="sm" onClick={() => setReviewing(true)} disabled={reviewItems.length === 0}>
            始める
          </Button>
        ) : (
          <ButtonLink href="/billing" size="sm" variant="tinted">
            PROにする
          </ButtonLink>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented<"list" | "stack" | "calendar">
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "リスト" },
            { value: "stack", label: "スタック" },
            { value: "calendar", label: "暦" },
          ]}
        />
        {view === "list" && (
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="ステータスで絞り込み"
              className="h-9 rounded-lg border border-border-subtle bg-surface-1 px-2.5 text-[13px]"
            >
              <option value="ALL">すべて</option>
              <option value="ACTIVE">利用中</option>
              <option value="PAUSED">一時停止</option>
              <option value="CANCELED">解約済み</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="並び替え"
              className="h-9 rounded-lg border border-border-subtle bg-surface-1 px-2.5 text-[13px]"
            >
              <option value="renewal">更新が近い順</option>
              <option value="amount">金額が高い順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<RepeatIcon size={28} />}
          title="サブスクを登録しましょう"
          description="毎月の固定費をまとめて管理。更新日も自動で記帳されます。"
        />
      ) : view === "list" ? (
        listItems.length === 0 ? (
          <EmptyState
            icon={<RepeatIcon size={28} />}
            title="該当するサブスクがありません"
            description="絞り込み条件を変えてお試しください。"
          />
        ) : (
        <div className="space-y-3">
          {listItems.map((it) => (
            <Card
              key={it.id}
              className={cn("p-4", it.wasteLevel === "waste" && "ambient")}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openEdit(it)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-text-secondary">
                    <CategoryIcon name={it.icon} size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{it.name}</span>
                      {it.status !== "ACTIVE" && (
                        <Badge size="sm">{it.statusLabel}</Badge>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-text-tertiary">
                      {it.cycleLabel} ・ 次回 {it.nextRenewalLabel}
                      {it.paymentName ? ` ・ ${it.paymentName}` : ""}
                    </span>
                  </span>
                </button>
                <div className="text-right">
                  <div className="text-[15px] font-semibold tabular-nums">
                    {formatMoney(it.monthly, currency)}
                    <span className="text-[11px] text-text-tertiary">/月</span>
                  </div>
                  <div className="text-[11px] text-text-tertiary tabular-nums">
                    年 {formatMoney(it.yearly, currency)}
                  </div>
                </div>
              </div>

              {(it.wasteMessage || canEdit || it.cancelUrl) && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                  <span className="min-w-0 truncate text-[12px] text-warning">
                    {it.wasteMessage}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {it.cancelUrl && (
                      <a
                        href={it.cancelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
                      >
                        解約アシスト
                      </a>
                    )}
                    {canEdit && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => used(it.id)}>
                          <CheckIcon size={16} /> 使った
                        </Button>
                        <button
                          onClick={() => remove(it.id)}
                          aria-label="削除"
                          className="grid h-8 w-8 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
        )
      ) : view === "calendar" ? (
        <Card className="overflow-hidden">
          {calendar.map((mo) => (
            <div
              key={mo.label}
              className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0"
            >
              <span className="w-24 text-[14px] font-medium tabular-nums">{mo.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${Math.min(100, totals.monthly > 0 ? (mo.total / (totals.monthly * 1.5)) * 100 : 0)}%`,
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-[14px] font-semibold tabular-nums">
                {formatMoney(mo.total, currency)}
              </span>
            </div>
          ))}
        </Card>
      ) : (
        <div className="space-y-4">
          {stack.groups.length === 0 && !stack.unassigned ? (
            <EmptyState
              icon={<CardIcon size={28} />}
              title="支払い方法が未登録です"
              description="設定から支払い方法を追加すると、カードごとにサブスクを整理できます。"
            />
          ) : (
            <>
              {stack.groups.map((g) => (
                <StackCard key={g.name} group={g} />
              ))}
              {stack.unassigned && <StackCard group={stack.unassigned} />}
            </>
          )}
        </div>
      )}

      {canEdit && (
        <button
          onClick={openAdd}
          aria-label="サブスクを追加"
          className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent-hover active:scale-95 md:bottom-8 md:right-8"
        >
          <PlusIcon size={26} />
        </button>
      )}

      <SubscriptionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        paymentMethods={paymentMethods}
        initial={editing}
      />

      {reviewing && (
        <SubscriptionReview items={reviewItems} onClose={() => setReviewing(false)} />
      )}
    </div>
  );
}

function StackCard({ group }: { group: StackGroup }) {
  const grad = gradientOf(group.color);
  return (
    <div className="relative">
      <div className={cn("rounded-2xl bg-gradient-to-br p-5 text-white shadow-md", grad)}>
        <div className="flex items-center justify-between">
          <CardIcon size={24} />
          <span className="text-[13px] opacity-80">月額</span>
        </div>
        <div className="mt-6 text-[15px] font-medium">{group.name}</div>
        <div className="text-[22px] font-bold tabular-nums">{formatMoney(group.monthly)}</div>
      </div>
      {group.subs.length > 0 && (
        <div className="mx-3 -mt-2 rounded-b-2xl border border-t-0 border-border-subtle bg-surface-1 px-4 pb-3 pt-4">
          {group.subs.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2.5 border-t border-border-subtle py-2 first:border-t-0 text-[14px]"
            >
              <CategoryIcon name={s.icon} size={18} className="text-text-secondary" />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="tabular-nums text-text-tertiary">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
