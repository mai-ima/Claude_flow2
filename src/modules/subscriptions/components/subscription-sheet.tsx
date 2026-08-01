"use client";

import { useState, useTransition } from "react";
import { addMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BellIcon } from "@/components/icons";
import { formatMoney, formatWorkTime } from "@/lib/money";
import { toDateInput } from "@/lib/date";
import { CYCLE_LABEL, STATUS_LABEL } from "@/lib/enums";
import { SERVICE_CATALOG } from "@/lib/service-catalog";
import { createSubscription, updateSubscription } from "../actions";
import {
  cancelImpact,
  usagePeriod,
  estimatedTotalPaid,
  reviewAge,
  needsReview,
  REVIEW_INTERVAL_DAYS,
} from "../insights";

export interface SubFormValue {
  id?: string;
  name: string;
  amount: number;
  cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "QUARTERLY";
  status: "ACTIVE" | "PAUSED" | "CANCELED" | "TRIAL";
  nextRenewalAt: string;
  /** 使い始めた日（任意）。空なら利用期間・累計は出せない。 */
  startedAt: string;
  trialEndsAt: string;
  categoryId: string;
  paymentMethodId: string;
  reminderDaysBefore: number;
  autoPostTransaction: boolean;
  serviceKey: string;
  notes: string;
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

function defaults(): SubFormValue {
  // Date#setMonth は月末が繰り上がる（1/31 に +1 で 3/3 になり 2 月が飛ぶ）。
  // date-fns の addMonths は月末を丸める。
  const d = addMonths(new Date(), 1);
  return {
    name: "",
    amount: 0,
    cycle: "MONTHLY",
    status: "ACTIVE",
    nextRenewalAt: toDateInput(d),
    startedAt: "",
    trialEndsAt: "",
    categoryId: "",
    paymentMethodId: "",
    reminderDaysBefore: 3,
    autoPostTransaction: true,
    serviceKey: "",
    notes: "",
  };
}

export function SubscriptionSheet({
  open,
  onClose,
  categories,
  paymentMethods,
  initial,
  currency = "JPY",
  canUseReminders = false,
  priceHistory = [],
  lastReviewedAt = null,
  hourlyWage = null,
}: {
  open: boolean;
  onClose: () => void;
  categories: Option[];
  paymentMethods: Option[];
  initial?: SubFormValue;
  currency?: string;
  canUseReminders?: boolean;
  priceHistory?: { dateLabel: string; oldAmount: number; newAmount: number; increase: boolean }[];
  /** 最後に見直した日（ISO 文字列）。未見直しなら null。 */
  lastReviewedAt?: string | null;
  /** 想定時給。設定されていれば解約額を労働時間に換算する。 */
  hourlyWage?: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [v, setV] = useState<SubFormValue>(() => initial ?? { ...defaults(), nextRenewalAt: "" });

  // open 切替時にフォームを初期化（描画中の状態調整）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setV(initial ?? defaults());
      setError(undefined);
    }
  }

  const reminderOptions = Array.from(
    new Set([0, 1, 2, 3, 5, 7, 10, 14, 30, v.reminderDaysBefore]),
  ).sort((a, b) => a - b);

  function onName(name: string) {
    const match = SERVICE_CATALOG.find((s) => s.name === name);
    setV((s) => ({ ...s, name, serviceKey: match?.key ?? "" }));
  }

  function submit() {
    setError(undefined);
    start(async () => {
      const payload = {
        ...(v.id ? { id: v.id } : {}),
        name: v.name,
        amount: v.amount,
        cycle: v.cycle,
        status: v.status,
        nextRenewalAt: new Date(v.nextRenewalAt),
        startedAt: v.startedAt ? new Date(v.startedAt) : null,
        trialEndsAt: v.status === "TRIAL" && v.trialEndsAt ? new Date(v.trialEndsAt) : null,
        categoryId: v.categoryId || null,
        paymentMethodId: v.paymentMethodId || null,
        reminderDaysBefore: v.reminderDaysBefore,
        autoPostTransaction: v.autoPostTransaction,
        serviceKey: v.serviceKey || null,
        notes: v.notes || null,
      };
      const res = v.id
        ? await updateSubscription(payload)
        : await createSubscription(payload);
      if (res.ok) {
        toast.success(v.id ? "サブスクを更新しました" : "サブスクを追加しました");
        onClose();
        router.refresh();
      } else {
        setError(
          res.error === "処理に失敗しました。時間をおいて再度お試しください。"
            ? res.error
            : res.error,
        );
      }
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={v.id ? "サブスクを編集" : "サブスクを追加"}
      footer={
        <Button full size="lg" onClick={submit} disabled={pending || !v.name || v.amount <= 0}>
          {pending ? "保存中…" : "保存する"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="サービス名">
          <Input
            list="service-catalog"
            value={v.name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Netflix など"
          />
          <datalist id="service-catalog">
            {SERVICE_CATALOG.map((s) => (
              <option key={s.key} value={s.name} />
            ))}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="金額">
            <Input
              inputMode="numeric"
              value={v.amount ? String(v.amount) : ""}
              onChange={(e) =>
                setV((s) => ({
                  ...s,
                  amount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)),
                }))
              }
              placeholder="0"
            />
          </Field>
          <Field label="周期">
            <Select
              value={v.cycle}
              onChange={(e) => setV((s) => ({ ...s, cycle: e.target.value as SubFormValue["cycle"] }))}
            >
              {Object.entries(CYCLE_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <p className="-mt-1 text-[12px] text-text-tertiary">
          年額換算: {formatMoney(
            v.cycle === "YEARLY"
              ? v.amount
              : v.cycle === "MONTHLY"
                ? v.amount * 12
                : v.cycle === "WEEKLY"
                  ? v.amount * 52
                  : v.amount * 4,
            currency,
          )}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="次回更新日">
            <Input
              type="date"
              value={v.nextRenewalAt}
              onChange={(e) => setV((s) => ({ ...s, nextRenewalAt: e.target.value }))}
            />
          </Field>
          <Field label="使い始めた日" hint="任意。入れると利用期間が出ます。">
            <Input
              type="date"
              value={v.startedAt}
              onChange={(e) => setV((s) => ({ ...s, startedAt: e.target.value }))}
            />
          </Field>
        </div>

        <Field label="ステータス">
          <Segmented
            className="w-full"
            value={v.status}
            onChange={(status) => setV((s) => ({ ...s, status }))}
            options={(["ACTIVE", "TRIAL", "PAUSED"] as const).map((k) => ({
              value: k,
              label: STATUS_LABEL[k],
            }))}
          />
        </Field>

        {v.status === "TRIAL" && (
          <Field label="無料体験の終了日">
            <Input
              type="date"
              value={v.trialEndsAt}
              onChange={(e) => setV((s) => ({ ...s, trialEndsAt: e.target.value }))}
            />
            <p className="mt-1 text-[12px] text-text-tertiary">
              終了が近づくと通知でお知らせします（リマインダー設定の日数を使用）。
            </p>
          </Field>
        )}

        {v.id && (
          <DecisionPanel
            amount={v.amount}
            cycle={v.cycle}
            startedAt={v.startedAt}
            lastReviewedAt={lastReviewedAt}
            hourlyWage={hourlyWage}
            currency={currency}
          />
        )}

        {priceHistory.length > 0 && (
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <div className="mb-2 text-[13px] font-medium text-text-secondary">価格改定の履歴</div>
            <ul className="space-y-1.5">
              {priceHistory.map((h, i) => (
                <li key={i} className="flex items-center justify-between text-[13px] tabular-nums">
                  <span className="text-text-tertiary">{h.dateLabel}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-text-tertiary line-through">{formatMoney(h.oldAmount, currency)}</span>
                    <span>→</span>
                    <span className={h.increase ? "font-semibold text-expense" : "font-semibold text-income"}>
                      {formatMoney(h.newAmount, currency)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="カテゴリ">
            <Select
              value={v.categoryId}
              onChange={(e) => setV((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="">未分類</option>
              {categories.filter((c) => c.type === "EXPENSE").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
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
        </div>

        {/* 更新リマインダー */}
        {canUseReminders ? (
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <BellIcon size={14} className="text-accent" />
                更新リマインダー
              </span>
            }
          >
            <Select
              value={String(v.reminderDaysBefore)}
              onChange={(e) =>
                setV((s) => ({ ...s, reminderDaysBefore: parseInt(e.target.value, 10) }))
              }
            >
              {reminderOptions.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "更新日の当日に通知" : `更新の${n}日前に通知`}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
            <span className="flex items-center gap-2 text-[14px] text-text-secondary">
              <BellIcon size={16} className="text-text-tertiary" />
              更新リマインダーはプラス以上で利用できます
            </span>
            <ButtonLink href="/billing" size="sm" variant="tinted">
              プラン
            </ButtonLink>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-[14px]">更新日に自動で家計簿へ記帳</span>
          <Switch
            checked={v.autoPostTransaction}
            onChange={(checked) => setV((s) => ({ ...s, autoPostTransaction: checked }))}
            aria-label="更新日に自動で家計簿へ記帳"
          />
        </div>

        <Field label="メモ（任意）">
          <Textarea
            value={v.notes}
            onChange={(e) => setV((s) => ({ ...s, notes: e.target.value }))}
          />
        </Field>

        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Sheet>
  );
}

/**
 * 続けるか止めるかを決めるための材料。
 *
 * 結論は書かない。「解約すべき」と言われても確かめようがない。
 * いくら払ってきて、やめると年いくら浮くのか、数字だけを並べる。
 * 入力中の金額に追従するので、値上げ後の額を入れて効きを見ることもできる。
 */
function DecisionPanel({
  amount,
  cycle,
  startedAt,
  lastReviewedAt,
  hourlyWage,
  currency,
}: {
  amount: number;
  cycle: SubFormValue["cycle"];
  startedAt: string;
  lastReviewedAt: string | null;
  hourlyWage: number | null;
  currency: string;
}) {
  const started = startedAt ? new Date(startedAt) : null;
  const reviewed = lastReviewedAt ? new Date(lastReviewedAt) : null;
  const period = usagePeriod(started);
  const paid = estimatedTotalPaid(amount, cycle, started);
  const impact = cancelImpact(amount, cycle, hourlyWage);
  const age = reviewAge(reviewed);
  const due = needsReview(reviewed);

  return (
    <div className="rounded-xl bg-surface-2 px-4 py-3">
      <div className="mb-2 text-[13px] font-medium text-text-secondary">判断のための数字</div>

      <dl className="space-y-2">
        <Row label="解約すると年間で">
          <span className="font-semibold text-income">{formatMoney(impact.yearly, currency)}</span>
          <span className="text-text-tertiary"> 浮きます</span>
        </Row>
        <Row label="月あたりに直すと">
          {formatMoney(impact.monthly, currency)}
        </Row>
        {impact.workMinutes !== null && (
          <Row label="年額を働く時間に直すと">
            {formatWorkTime(impact.workMinutes)}
          </Row>
        )}
        <Row label="使っている期間">
          {period ? period.label : <span className="text-text-tertiary">使い始めた日が未記入</span>}
        </Row>
        <Row label="これまでの支払い（およそ）">
          {paid !== null ? (
            formatMoney(paid, currency)
          ) : (
            <span className="text-text-tertiary">使い始めた日が未記入</span>
          )}
        </Row>
        <Row label="最後に見直したのは">
          {age ? age.label : <span className="text-text-tertiary">まだ見直していません</span>}
          {due && <span className="ml-1.5 text-warning">見直しどき</span>}
        </Row>
      </dl>

      <p className="mt-2.5 text-[11px] leading-relaxed text-text-tertiary">
        支払いの合計は「いまの金額 × 経過した月数」の見積りです。途中で金額が
        変わっていた場合はずれます。見直しは{REVIEW_INTERVAL_DAYS}日ごとを目安にしています。
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <dt className="shrink-0 text-text-tertiary">{label}</dt>
      <dd className="min-w-0 text-right tabular-nums">{children}</dd>
    </div>
  );
}
