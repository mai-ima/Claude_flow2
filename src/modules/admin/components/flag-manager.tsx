"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { TrashIcon } from "@/components/icons";
import { upsertFlag, deleteFlag } from "../settings-actions";

interface Flag {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  rolloutPct: number;
  tiers: string[] | null;
}

export function FlagManager({ flags }: { flags: Flag[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [pct, setPct] = useState("0");

  function save(input: Parameters<typeof upsertFlag>[0]) {
    setMsg(undefined);
    start(async () => {
      const res = await upsertFlag(input);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        {flags.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-text-secondary">
            フラグはまだありません。
          </p>
        ) : (
          flags.map((f) => (
            <div key={f.key} className="border-t border-border-subtle px-4 py-3 first:border-t-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">{f.label}</div>
                  <div className="font-mono text-[12px] text-text-tertiary">{f.key}</div>
                  {f.description && (
                    <div className="text-[13px] text-text-secondary">{f.description}</div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-[13px]">
                  <span className="text-text-tertiary">公開率</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={f.rolloutPct}
                    aria-label={`${f.label} の公開率`}
                    onBlur={(e) =>
                      save({
                        key: f.key,
                        label: f.label,
                        description: f.description ?? undefined,
                        enabled: f.enabled,
                        rolloutPct: Number(e.target.value),
                        tiers: (f.tiers ?? []) as ("FREE" | "PLUS" | "PRO")[],
                      })
                    }
                    className="h-9 w-20 rounded-lg border border-border-subtle bg-surface-1 px-2 text-right tabular-nums"
                  />
                  <span className="text-text-tertiary">%</span>
                </label>
                <Switch
                  checked={f.enabled}
                  aria-label={`${f.label} を有効にする`}
                  onChange={(v) =>
                    save({
                      key: f.key,
                      label: f.label,
                      description: f.description ?? undefined,
                      enabled: v,
                      rolloutPct: f.rolloutPct,
                      tiers: (f.tiers ?? []) as ("FREE" | "PLUS" | "PRO")[],
                    })
                  }
                />
                <button
                  onClick={() =>
                    start(async () => {
                      const res = await deleteFlag({ key: f.key });
                      if (!res.ok) setMsg(res.error);
                      router.refresh();
                    })
                  }
                  aria-label={`${f.label} を削除`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-text-tertiary hover:bg-expense/10 hover:text-expense"
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-1 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="キー" hint="英小文字・数字・_">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="settlement" />
          </Field>
          <Field label="表示名">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="精算機能" />
          </Field>
          <Field label="公開率">
            <Select value={pct} onChange={(e) => setPct(e.target.value)}>
              {["0", "5", "10", "25", "50", "100"].map((v) => (
                <option key={v} value={v}>
                  {v}%
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          size="sm"
          disabled={pending || !key || !label}
          onClick={() => {
            save({ key, label, enabled: true, rolloutPct: Number(pct), tiers: [] });
            setKey("");
            setLabel("");
          }}
        >
          フラグを追加
        </Button>
        {msg && (
          <p role="alert" className="text-[13px] text-expense">
            {msg}
          </p>
        )}
      </div>
      <p className="text-[12px] text-text-tertiary">
        公開率は利用者IDのハッシュで判定します。同じ人には常に同じ結果になるため、
        読み込むたびに機能が出たり消えたりすることはありません。
      </p>
    </div>
  );
}
