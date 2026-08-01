"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { AmountPad } from "./amount-pad";
import { formatMoney } from "@/lib/money";
import { todayLocal } from "@/lib/date";
import { createTransaction, updateTransaction } from "../actions";

type TxnType = "INCOME" | "EXPENSE";

export interface TxnFormValue {
  id?: string;
  type: TxnType;
  amount: number;
  occurredAt: string; // yyyy-mm-dd
  categoryId: string;
  /** 選択中カテゴリの表示名。アーカイブ済みで一覧に無い場合の補完に使う。 */
  categoryName?: string;
  paymentMethodId: string;
  /** 実際に払った人。共有帳簿の精算に使う。空なら未指定。 */
  paidByUserId: string;
  memo: string;
}

interface Option {
  id: string;
  name: string;
  type?: string;
}

function todayStr() {
  return todayLocal();
}

export function TransactionSheet({
  open,
  onClose,
  categories,
  paymentMethods,
  initial,
  currency = "JPY",
  beta = false,
  today,
  members = [],
}: {
  open: boolean;
  onClose: () => void;
  categories: Option[];
  paymentMethods: Option[];
  initial?: TxnFormValue;
  currency?: string;
  beta?: boolean;
  /** 共有帳簿のメンバー。1人以下なら「払った人」欄は出さない。 */
  members?: Option[];
  /** サーバー基準の今日(yyyy-MM-dd)。端末のタイムゾーンが日本時間でないと
   *  既定の日付がアプリの「今日」とずれるため、サーバーから渡す。 */
  today?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [padKey, setPadKey] = useState(0);
  const blank = (): TxnFormValue => ({
    type: "EXPENSE",
    amount: 0,
    occurredAt: today ?? todayStr(),
    categoryId: "",
    paymentMethodId: "",
    paidByUserId: "",
    memo: "",
  });
  const [v, setV] = useState<TxnFormValue>(() => initial ?? { ...blank(), occurredAt: "" });

  // open が切り替わった瞬間にフォームを初期化（描画中の状態調整＝React 推奨パターン）
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setV(initial ?? blank());
      setError(undefined);
      setPadKey((k) => k + 1);
    }
  }

  const cats = categories.filter((c) => c.type === v.type);
  // アーカイブ済みカテゴリは一覧に出ないため、編集中の値が選択肢から消えて
  // 保存時に黙って「未分類」へ書き換わってしまう。現在値は必ず選択肢に残す。
  const orphanCategory =
    v.categoryId && !cats.some((c) => c.id === v.categoryId)
      ? { id: v.categoryId, name: v.categoryName ?? "アーカイブ済みのカテゴリ" }
      : null;

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
        paidByUserId: v.paidByUserId || null,
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
          setPadKey((k) => k + 1);
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

        {/* 金額 */}
        {beta ? (
          <AmountPad
            key={padKey}
            initial={v.amount}
            type={v.type}
            currency={currency}
            onChange={(amount) => setV((s) => ({ ...s, amount }))}
          />
        ) : (
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
        )}

        <Field label="カテゴリ">
          <Select
            value={v.categoryId}
            onChange={(e) => setV((s) => ({ ...s, categoryId: e.target.value }))}
          >
            <option value="">未分類</option>
            {orphanCategory && (
              <option value={orphanCategory.id}>{orphanCategory.name}（アーカイブ済み）</option>
            )}
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

        {members.length > 1 && (
          <Field
            label="払った人"
            hint="精算で使います。選ばないと、立て替えとしては数えません。"
          >
            <Select
              value={v.paidByUserId}
              onChange={(e) => setV((s) => ({ ...s, paidByUserId: e.target.value }))}
            >
              <option value="">指定なし</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
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
