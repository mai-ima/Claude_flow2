"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CardIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { PAYMENT_TYPE_LABEL, type PaymentMethodType } from "@/lib/enums";
import { createPaymentMethod, deletePaymentMethod } from "../actions";

interface PM {
  id: string;
  name: string;
  type: string;
  color: string;
}

const COLORS = ["blue", "purple", "pink", "teal", "green", "orange", "gray"];

export function PaymentMethodsManager({ methods }: { methods: PM[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", type: "CARD" as PaymentMethodType, color: "blue" });

  function add() {
    start(async () => {
      const res = await createPaymentMethod(form);
      if (res.ok) {
        setForm({ name: "", type: "CARD", color: "blue" });
        setAdding(false);
        router.refresh();
      }
    });
  }
  async function remove(id: string) {
    const ok = await confirm({
      title: "この支払い方法を削除しますか？",
      body: "紐づくサブスク・取引は、支払い方法が未設定になります。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deletePaymentMethod({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("削除しました");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {methods.length > 0 && (
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-lg text-white"
                style={{ background: `var(--color-${m.color === "gray" ? "text-tertiary" : "accent"})` }}
              >
                <CardIcon size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-medium">{m.name}</span>
                <span className="block text-[12px] text-text-tertiary">
                  {PAYMENT_TYPE_LABEL[m.type as PaymentMethodType]}
                </span>
              </span>
              <button
                onClick={() => remove(m.id)}
                aria-label="削除"
                className="grid h-8 w-8 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-3 rounded-xl border border-border-subtle p-3">
          <Input
            placeholder="名前（例: 楽天カード）"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.type}
              onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as PaymentMethodType }))}
            >
              {Object.entries(PAYMENT_TYPE_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={form.color}
              onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))}
            >
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add} disabled={pending || !form.name}>
              追加
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="tinted" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon size={16} /> 支払い方法を追加
        </Button>
      )}
    </div>
  );
}
