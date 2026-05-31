"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney } from "@/lib/money";
import { CYCLE_LABEL, STATUS_LABEL } from "@/lib/enums";
import { SERVICE_CATALOG } from "@/lib/service-catalog";
import { createSubscription, updateSubscription } from "../actions";

export interface SubFormValue {
  id?: string;
  name: string;
  amount: number;
  cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "QUARTERLY";
  status: "ACTIVE" | "PAUSED" | "CANCELED" | "TRIAL";
  nextRenewalAt: string;
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
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return {
    name: "",
    amount: 0,
    cycle: "MONTHLY",
    status: "ACTIVE",
    nextRenewalAt: d.toISOString().slice(0, 10),
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
}: {
  open: boolean;
  onClose: () => void;
  categories: Option[];
  paymentMethods: Option[];
  initial?: SubFormValue;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [v, setV] = useState<SubFormValue>(initial ?? defaults());

  useEffect(() => {
    if (open) {
      setV(initial ?? defaults());
      setError(undefined);
    }
  }, [open, initial]);

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
          )}
        </p>

        <Field label="次回更新日">
          <Input
            type="date"
            value={v.nextRenewalAt}
            onChange={(e) => setV((s) => ({ ...s, nextRenewalAt: e.target.value }))}
          />
        </Field>

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

        <label className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-[14px]">更新日に自動で家計簿へ記帳</span>
          <input
            type="checkbox"
            checked={v.autoPostTransaction}
            onChange={(e) => setV((s) => ({ ...s, autoPostTransaction: e.target.checked }))}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </label>

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
