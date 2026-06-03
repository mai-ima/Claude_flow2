"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { ActivityRing } from "@/components/ui/activity-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TargetIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { colorOf } from "@/lib/colors";
import { createGoal, updateGoal, deleteGoal, contributeGoal } from "../actions";

export interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadlineLabel: string | null;
  /** 編集フォーム用の期日（yyyy-MM-dd）。未設定は null。 */
  deadlineInput: string | null;
  color: string;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  overdue: boolean;
}

const COLORS = ["blue", "teal", "green", "mint", "orange", "pink", "purple", "indigo"];

function todayPlus(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function GoalsClient({
  goals,
  canEdit,
  currency,
  totalCurrent,
  totalTarget,
}: {
  goals: GoalItem[];
  canEdit: boolean;
  currency: string;
  totalCurrent: number;
  totalTarget: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [, start] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contribFor, setContribFor] = useState<GoalItem | null>(null);
  const [contribAmount, setContribAmount] = useState(0);
  const [contribError, setContribError] = useState<string>();
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    id: "",
    name: "",
    targetAmount: 0,
    deadline: todayPlus(6),
    color: "blue",
  });

  function openNew() {
    setForm({ id: "", name: "", targetAmount: 0, deadline: todayPlus(6), color: "blue" });
    setError(undefined);
    setSheetOpen(true);
  }
  function openEdit(g: GoalItem) {
    setForm({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      // 既存の期日を保持（無い場合のみ既定値）。
      deadline: g.deadlineInput ?? todayPlus(6),
      color: g.color,
    });
    setError(undefined);
    setSheetOpen(true);
  }
  function save() {
    setError(undefined);
    start(async () => {
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        targetAmount: form.targetAmount,
        deadline: form.deadline ? new Date(form.deadline) : null,
        color: form.color,
      };
      const res = form.id ? await updateGoal(payload) : await createGoal(payload);
      if (res.ok) {
        setSheetOpen(false);
        router.refresh();
      } else setError(res.error);
    });
  }
  async function remove(id: string) {
    const ok = await confirm({
      title: "この目標を削除しますか？",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteGoal({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("目標を削除しました");
      router.refresh();
    });
  }
  function contribute() {
    if (!contribFor) return;
    setContribError(undefined);
    start(async () => {
      const res = await contributeGoal({ id: contribFor.id, amount: contribAmount });
      if (!res.ok) {
        setContribError(res.error);
        return;
      }
      setContribFor(null);
      setContribAmount(0);
      router.refresh();
    });
  }

  return (
    <div>
      {goals.length === 0 ? (
        <EmptyState
          icon={<TargetIcon size={28} />}
          title="目標を立てましょう"
          description="旅行や新しい家電など、貯めたい金額と期日を決めて、コツコツ積み立て。"
          action={canEdit ? <Button onClick={openNew}><PlusIcon size={18} /> 目標を追加</Button> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {/* 全体サマリー */}
          <Card className="p-5">
            <div className="flex items-center gap-5">
              <ActivityRing
                size={96}
                thickness={11}
                tracks={[
                  {
                    value: totalTarget > 0 ? totalCurrent / totalTarget : 0,
                    color: "var(--color-accent)",
                  },
                ]}
              >
                <span className="text-[15px] font-bold tabular-nums">
                  {totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0}%
                </span>
              </ActivityRing>
              <div className="flex-1 space-y-2 text-[14px]">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">貯まっている合計</span>
                  <span className="font-semibold tabular-nums">{formatMoney(totalCurrent, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">目標の合計</span>
                  <span className="font-semibold tabular-nums">{formatMoney(totalTarget, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">目標の数</span>
                  <span className="font-semibold tabular-nums">{goals.length}件</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
            const done = ratio >= 1;
            return (
              <Card key={g.id} className="p-5">
                <div className="flex items-center gap-4">
                  <ActivityRing
                    size={84}
                    thickness={9}
                    tracks={[{ value: ratio, color: colorOf(g.color) }]}
                  >
                    <span className="text-[13px] font-bold tabular-nums">
                      {Math.min(100, Math.round(ratio * 100))}%
                    </span>
                  </ActivityRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => openEdit(g)} className="truncate text-left text-[16px] font-semibold">
                        {g.name}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => remove(g.id)}
                          aria-label="削除"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] tabular-nums text-text-secondary">
                      {formatMoney(g.currentAmount, currency)} / {formatMoney(g.targetAmount, currency)}
                    </div>
                    {g.deadlineLabel && (
                      <div className="text-[12px] text-text-tertiary">期日 {g.deadlineLabel}</div>
                    )}
                    {!done && g.overdue ? (
                      <div className="mt-1">
                        <Badge tone="expense" size="sm">期限超過</Badge>
                      </div>
                    ) : !done && g.monthlyNeeded !== null ? (
                      <div className="mt-1 text-[12px] text-text-secondary">
                        あと{g.monthsLeft}ヶ月 ・ 月{" "}
                        <b className="tabular-nums">{formatMoney(g.monthlyNeeded, currency)}</b> で達成
                      </div>
                    ) : null}
                  </div>
                </div>
                {canEdit && (
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    {done ? (
                      <div className="text-center text-[13px] font-medium text-success">達成しました</div>
                    ) : (
                      <Button
                        variant="tinted"
                        size="sm"
                        full
                        onClick={() => {
                          setContribFor(g);
                          setContribAmount(0);
                          setContribError(undefined);
                        }}
                      >
                        <PlusIcon size={16} /> 積み立てる
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {canEdit && goals.length > 0 && (
        <button
          onClick={openNew}
          aria-label="目標を追加"
          className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent-hover active:scale-95 md:bottom-8 md:right-8"
        >
          <PlusIcon size={26} />
        </button>
      )}

      {/* create/edit */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={form.id ? "目標を編集" : "目標を追加"}
        footer={
          <Button full size="lg" onClick={save} disabled={!form.name || form.targetAmount <= 0}>
            保存する
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="目標名">
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="例: 沖縄旅行" />
          </Field>
          <Field label="目標額">
            <Input
              inputMode="numeric"
              value={form.targetAmount ? String(form.targetAmount) : ""}
              onChange={(e) => setForm((s) => ({ ...s, targetAmount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)) }))}
              placeholder="200000"
            />
          </Field>
          <Field label="期日（任意）">
            <Input type="date" value={form.deadline} onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))} />
          </Field>
          <Field label="色">
            <Select value={form.color} onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))}>
              {COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      </Sheet>

      {/* contribute */}
      <Sheet
        open={contribFor !== null}
        onClose={() => setContribFor(null)}
        title={`${contribFor?.name ?? ""} に積み立て`}
        footer={
          <Button full size="lg" onClick={contribute} disabled={contribAmount === 0}>
            積み立てる
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-2 px-5 py-6 text-center">
            <input
              inputMode="numeric"
              value={contribAmount ? String(contribAmount) : ""}
              onChange={(e) => setContribAmount(Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}
              placeholder="0"
              aria-label="積立額"
              className="w-full bg-transparent text-center text-[36px] font-bold tabular-nums outline-none placeholder:text-text-tertiary"
            />
            <div className="text-[13px] text-text-tertiary">{formatMoney(contribAmount, currency)} を追加</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 30000].map((v) => (
              <button
                key={v}
                onClick={() => setContribAmount((a) => a + v)}
                className="rounded-xl bg-surface-2 py-2 text-[13px] font-medium hover:opacity-80"
              >
                +{v / 1000}千
              </button>
            ))}
          </div>
          {contribError && <p className="text-[13px] text-expense">{contribError}</p>}
        </div>
      </Sheet>
    </div>
  );
}
