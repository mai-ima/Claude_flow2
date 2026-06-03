"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Currency, CURRENCY_LABEL } from "@/lib/enums";
import { updateLedgerSettings } from "../actions";

export function LedgerSettingsForm({
  ledgerId,
  name,
  currency,
  canEdit,
}: {
  ledgerId: string;
  name: string;
  currency: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [v, setV] = useState({ name, currency });

  if (!canEdit) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-text-secondary">表示通貨</span>
        <span className="text-[14px] font-medium">
          {CURRENCY_LABEL[currency as Currency] ?? currency}
        </span>
      </div>
    );
  }

  function save() {
    setSaved(false);
    setError(undefined);
    start(async () => {
      const res = await updateLedgerSettings({
        ledgerId,
        name: v.name,
        currency: v.currency as Currency,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Field label="帳簿の名前">
        <Input value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} />
      </Field>
      <Field label="表示通貨" hint="金額の表示に使う通貨です（為替の換算は行いません）。">
        <Select
          value={v.currency}
          onChange={(e) => setV((s) => ({ ...s, currency: e.target.value }))}
        >
          {Currency.options.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_LABEL[c]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || !v.name.trim()}>
          {pending ? "保存中…" : "保存する"}
        </Button>
        {saved && <span className="text-[13px] text-success">保存しました</span>}
        {error && <span className="text-[13px] text-expense">{error}</span>}
      </div>
    </div>
  );
}
