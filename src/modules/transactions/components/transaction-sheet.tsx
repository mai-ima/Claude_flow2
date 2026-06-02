"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney } from "@/lib/money";
import { createTransaction, updateTransaction } from "../actions";

type TxnType = "INCOME" | "EXPENSE";

export interface TxnFormValue {
  id?: string;
  type: TxnType;
  amount: number;
  occurredAt: string; // yyyy-mm-dd
  categoryId: string;
  paymentMethodId: string;
  memo: string;
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionSheet({
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
  initial?: TxnFormValue;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const blank = (): TxnFormValue => ({
    type: "EXPENSE",
    amount: 0,
    occurredAt: todayStr(),
    categoryId: "",
    paymentMethodId: "",
    memo: "",
  });
  const [v, setV] = useState<TxnFormValue>(initial ?? blank());

  // open が切り替わった瞬間にフォームを初期化（描画中の状態調整＝React 推奨パターン）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setV(initial ?? blank());
      setError(undefined);
    }
  }

  const cats = categories.filter((c) => c.type === v.type);

  function submit(keepOpen = false) {
    setError(undefined);
    start(async () => {
      const payload = {
        ...(v.id ? { id: v.id } : {}),
        type: v.type,
        amount: v.amount,
        occurredAt: new Date(v.occurredAt),
        categoryId: v.categoryId || null,
        paymentMethodId: v.paymentMethodId || null,
        memo: v.memo || null,
      };
      const res = v.id
        ? await updateTransaction(payload)
        : await createTransaction(payload);
      if (res.ok) {
        router.refresh();
        if (keepOpen && !v.id) {
          // 連続入力: 金額とメモだけ初期化し、種別/カテゴリ/日付は維持
          setV((s) => ({ ...s, amount: 0, memo: "" }));
        } else {
          onClose();
        }
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={v.id ? "記録を編集" : "記録を追加"}
      footer={
        <div className="flex gap-2">
          {!v.id && (
            <Button
              size="lg"
              variant="gray"
              onClick={() => submit(true)}
              disabled={pending || v.amount <= 0}
            >
              続けて追加
            </Button>
          )}
          <Button full size="lg" onClick={() => submit(false)} disabled={pending || v.amount <= 0}>
            {pending ? "保存中…" : "保存する"}
          </Button>
        </div>
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

        {/* 金額（大きく） */}
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
            {v.type === "EXPENSE" ? "支出" : "収入"}・{formatMoney(v.amount)}
          </div>
        </div>

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

        <Field label="日付">
          <Input
            type="date"
            value={v.occurredAt}
            onChange={(e) => setV((s) => ({ ...s, occurredAt: e.target.value }))}
          />
        </Field>

        <Field label="メモ（任意）">
          <Textarea
            value={v.memo}
            onChange={(e) => setV((s) => ({ ...s, memo: e.target.value }))}
            placeholder="スーパーで買い物 など"
          />
        </Field>

        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Sheet>
  );
}
