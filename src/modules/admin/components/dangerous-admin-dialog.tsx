"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

/**
 * 管理者の危険操作に共通の確認シート。
 *
 * 求めるのは2つ:
 *  - 対象のメールアドレスをそのまま打つこと（行の取り違えを防ぐ）
 *  - 理由を書くこと（AuditLog に残り、後から経緯を追える）
 *
 * 理由のプリセットは、よくある文言を選べるようにしたもの。自由入力も可。
 */
const REASON_PRESETS = [
  "サポート対応",
  "不具合の補償",
  "本人からの依頼",
  "利用規約違反",
  "テスト・検証",
];

export function DangerousAdminDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  targetEmail,
  danger = false,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  targetEmail: string | null;
  danger?: boolean;
  onSubmit: (input: { confirmEmail: string; reason: string }) => void;
  pending?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState(REASON_PRESETS[0]);
  const [freeText, setFreeText] = useState("");

  const reason = preset === "その他" ? freeText.trim() : preset;
  const expected = (targetEmail ?? "").trim().toLowerCase();
  const matches = email.trim().toLowerCase() === expected && expected.length > 0;
  const ready = matches && reason.length > 0 && !pending;

  function close() {
    setEmail("");
    setFreeText("");
    setPreset(REASON_PRESETS[0]);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      footer={
        <div className="flex gap-2.5">
          <Button variant="gray" full size="lg" onClick={close} disabled={pending}>
            キャンセル
          </Button>
          <Button
            variant={danger ? "destructive" : "filled"}
            full
            size="lg"
            disabled={!ready}
            onClick={() => onSubmit({ confirmEmail: email, reason })}
          >
            {pending ? "実行中…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed text-text-secondary">{description}</p>

        <Field
          label="確認のため対象のメールアドレスを入力"
          hint={targetEmail ?? "（メール未設定のユーザーには実行できません）"}
        >
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={targetEmail ?? ""}
            autoComplete="off"
          />
        </Field>

        <Field label="理由（監査ログに残ります）">
          <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {REASON_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="その他">その他（自由入力）</option>
          </Select>
        </Field>

        {preset === "その他" && (
          <Field label="理由の内容">
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="例: 二重課金のため返金対応"
              maxLength={200}
            />
          </Field>
        )}
      </div>
    </Sheet>
  );
}
