"use client";

import { useState, useTransition } from "react";
import { addMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { ActivityRing } from "@/components/ui/activity-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { TargetIcon, PlusIcon, TrashIcon, RepeatIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { toDateInput, fromInputJST } from "@/lib/date";
import { colorOf } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { Fab } from "@/components/ui/fab";
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
  autoContributionAmount: number | null;
  autoContributionDay: number | null;
  history: { amount: number; dateLabel: string; auto: boolean }[];
}

const COLORS = ["blue", "teal", "green", "mint", "orange", "pink", "purple", "indigo"];

/**
 * Date#setMonth は月末が繰り上がる（1/31 に +1 すると 3/3 になり 2 月が飛ぶ）。
 * date-fns の addMonths は月末を丸めるため、そちらを使う。
 */
function todayPlus(months: number) {
  return toDateInput(addMonths(new Date(), months));
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
  const [contribMode, setContribMode] = useState<"add" | "withdraw">("add");
  const [contribError, setContribError] = useState<string>();
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    id: "",
    name: "",
    targetAmount: 0,
    deadline: "",
    color: "blue",
    autoOn: false,
    autoAmount: 0,
    autoDay: 1,
  });

  function openNew() {
    setForm({ id: "", name: "", targetAmount: 0, deadline: todayPlus(6), color: "blue", autoOn: false, autoAmount: 0, autoDay: 1 });
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
      autoOn: g.autoContributionAmount != null,
      autoAmount: g.autoContributionAmount ?? 0,
      autoDay: g.autoContributionDay ?? 1,
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
        deadline: form.deadline ? fromInputJST(form.deadline) : null,
        color: form.color,
        autoContributionAmount: form.autoOn ? form.autoAmount : null,
        autoContributionDay: form.autoOn ? form.autoDay : null,
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
    const amount = contribMode === "withdraw" ? -contribAmount : contribAmount;
    start(async () => {
      const res = await contributeGoal({ id: contribFor.id, amount });
      if (!res.ok) {
        setContribError(res.error);
        return;
      }
      setContribFor(null);
      setContribAmount(0);
      setContribMode("add");
      router.refresh();
    });
  }

  return (
    <div>
      {goals.length === 0 ? (
        <EmptyState
          icon={<TargetIcon size={28} />}
          title="貯金目標がまだありません"
          description="旅行や新しい家電など、貯めたい金額と期日をお決めいただくと、毎月少しずつ積み立てられます。"
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
                      <button onClick={() => openEdit(g)} className="tap-target truncate text-left text-[16px] font-semibold">
                        {g.name}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => remove(g.id)}
                          aria-label="削除"
                          className="tap-target grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
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
                        あと{g.monthsLeft}か月 ・ 月{" "}
                        <b className="tabular-nums">{formatMoney(g.monthlyNeeded, currency)}</b> で達成
                      </div>
                    ) : null}
                    {g.autoContributionAmount != null && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent">
                        <RepeatIcon size={13} />
                        毎月{g.autoContributionDay}日 ・ {formatMoney(g.autoContributionAmount, currency)} 自動積立
                      </div>
                    )}
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
                          setContribMode("add");
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
        <Fab onClick={openNew} label="目標を追加" />
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

          <div className="rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-medium">毎月の自動積立</div>
                <div className="text-[12px] text-text-tertiary">毎月決まった日に自動で積み立てます。</div>
              </div>
              <Switch
                checked={form.autoOn}
                onChange={(v) => setForm((s) => ({ ...s, autoOn: v }))}
                aria-label="自動積立"
              />
            </div>
            {form.autoOn && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="毎月の金額">
                  <Input
                    inputMode="numeric"
                    value={form.autoAmount ? String(form.autoAmount) : ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        autoAmount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)),
                      }))
                    }
                    placeholder="10000"
                  />
                </Field>
                <Field label="実行日">
                  <Select
                    value={String(form.autoDay)}
                    onChange={(e) => setForm((s) => ({ ...s, autoDay: parseInt(e.target.value, 10) }))}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}日</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>
          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      </Sheet>

      {/* contribute / withdraw */}
      <Sheet
        open={contribFor !== null}
        onClose={() => setContribFor(null)}
        title={contribFor?.name ?? ""}
        footer={
          <Button full size="lg" onClick={contribute} disabled={contribAmount === 0}>
            {contribMode === "withdraw" ? "引き出す" : "積み立てる"}
          </Button>
        }
      >
        <div className="space-y-4">
          <Segmented<"add" | "withdraw">
            className="w-full"
            value={contribMode}
            onChange={setContribMode}
            options={[
              { value: "add", label: "積立" },
              { value: "withdraw", label: "引き出し" },
            ]}
          />
          <div className="rounded-2xl bg-surface-2 px-5 py-6 text-center">
            <input
              inputMode="numeric"
              value={contribAmount ? String(contribAmount) : ""}
              onChange={(e) => setContribAmount(Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))}
              placeholder="0"
              aria-label={contribMode === "withdraw" ? "引き出し額" : "積立額"}
              className="w-full bg-transparent text-center text-[36px] font-bold tabular-nums outline-none placeholder:text-text-tertiary"
            />
            <div className="text-[13px] text-text-tertiary">
              {formatMoney(contribAmount, currency)} を{contribMode === "withdraw" ? "引き出す" : "追加"}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 30000].map((v) => (
              <button
                key={v}
                onClick={() => setContribAmount((a) => a + v)}
                className="min-h-11 rounded-xl bg-surface-2 text-[13px] font-medium hover:opacity-80"
              >
                +{v / 1000}千
              </button>
            ))}
          </div>
          {contribMode === "withdraw" && contribFor && (
            <p className="text-[12px] text-text-tertiary">
              現在の貯蓄額 {formatMoney(contribFor.currentAmount, currency)} を上限に引き出せます。
            </p>
          )}
          {contribError && <p className="text-[13px] text-expense">{contribError}</p>}

          {contribFor && contribFor.history.length > 0 && (
            <div className="border-t border-border-subtle pt-3">
              <div className="mb-2 text-[13px] font-medium text-text-tertiary">積立履歴</div>
              <ul className="space-y-1.5">
                {contribFor.history.map((h, i) => (
                  <li key={i} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      {h.auto && <RepeatIcon size={13} className="text-accent" />}
                      {h.dateLabel}
                      {h.auto ? " ・ 自動" : ""}
                    </span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        h.amount >= 0 ? "text-income" : "text-expense",
                      )}
                    >
                      {h.amount >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(h.amount), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
