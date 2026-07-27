"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { updateSetting } from "../settings-actions";

export function SystemSettingsForm({
  settings,
}: {
  settings: {
    notificationRetentionDays: number;
    wasteThresholdDays: number;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();

  function save(key: string, value: string | number | boolean) {
    setMsg(undefined);
    start(async () => {
      const res = await updateSetting({ key, value });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success("設定を保存しました");
      router.refresh();
    });
  }

  async function toggleMaintenance(next: boolean) {
    if (next) {
      const ok = await confirm({
        title: "メンテナンスモードにしますか？",
        body: "管理者以外はアプリを使えなくなります。定期処理は止まりません。",
        confirmText: "メンテナンスにする",
        danger: true,
      });
      if (!ok) return;
    }
    save("maintenanceMode", next);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-medium">メンテナンスモード</div>
          <div className="text-[13px] text-text-secondary">
            管理者以外を案内画面へ切り替えます。定期処理は継続します。
          </div>
        </div>
        <Switch
          checked={settings.maintenanceMode}
          onChange={toggleMaintenance}
          disabled={pending}
          aria-label="メンテナンスモード"
        />
      </div>

      <Field label="メンテナンス中の文面">
        <Input
          defaultValue={settings.maintenanceMessage}
          onBlur={(e) => {
            if (e.target.value !== settings.maintenanceMessage) {
              save("maintenanceMessage", e.target.value);
            }
          }}
        />
      </Field>

      <Field label="通知の保持日数" hint="既読の通知をこの日数を過ぎたら削除します。">
        <Input
          type="number"
          min={1}
          defaultValue={settings.notificationRetentionDays}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (v !== settings.notificationRetentionDays) save("notificationRetentionDays", v);
          }}
        />
      </Field>

      <Field
        label="未利用と判定する日数"
        hint="サブスクをこの日数使っていないと「見直しの候補」として通知します。"
      >
        <Input
          type="number"
          min={7}
          defaultValue={settings.wasteThresholdDays}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (v !== settings.wasteThresholdDays) save("wasteThresholdDays", v);
          }}
        />
      </Field>

      {msg && (
        <p role="alert" className="text-[13px] text-expense">
          {msg}
        </p>
      )}
    </div>
  );
}
