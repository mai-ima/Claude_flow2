"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateProfile } from "../actions";

export function ProfileForm({
  name,
  wage,
}: {
  name: string;
  wage: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [v, setV] = useState({ name, wage: wage ? String(wage) : "" });

  function save() {
    setSaved(false);
    start(async () => {
      const res = await updateProfile({
        name: v.name,
        assumedHourlyWage: v.wage ? Number(v.wage) : 0,
      });
      if (res.ok) {
        setSaved(true);
        setError(undefined);
        router.refresh();
      } else {
        setError(res.fieldErrors?.name?.[0] ?? res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Field label="お名前">
        <Input value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} />
      </Field>
      <Field label="想定時給（コストタイム換算用）" hint="支出を「働いた時間」に換算します。">
        <Input
          inputMode="numeric"
          value={v.wage}
          onChange={(e) => setV((s) => ({ ...s, wage: e.target.value.replace(/\D/g, "") }))}
          placeholder="例: 1500"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "保存中…" : "保存する"}
        </Button>
        {saved && <span className="text-[13px] text-success">保存しました</span>}
        {error && (
          <span role="alert" className="text-[13px] text-expense">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
