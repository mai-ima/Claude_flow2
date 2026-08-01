"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { BellIcon, TrashIcon } from "@/components/icons";
import { updateFeedback, deleteFeedback } from "../actions";
import {
  FEEDBACK_KIND_LABEL,
  FEEDBACK_STATUS_LABEL,
  type FeedbackKind,
  type FeedbackStatus,
} from "../schema";

export interface FeedbackRow {
  id: string;
  kind: string;
  body: string;
  contactEmail: string | null;
  fromPath: string | null;
  userAgent: string | null;
  appVersion: string | null;
  status: string;
  adminNote: string | null;
  handledByName: string | null;
  handledAtLabel: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAtLabel: string;
}

const STATUSES: FeedbackStatus[] = ["NEW", "READING", "DONE", "WONTFIX"];

/**
 * 届いた報告の一覧（管理）。
 *
 * 送られてきた本文はそのまま出す。要約すると、直すのに要る細かい情報
 * （「保存を押しても何も起きない」の「押しても」）が落ちる。
 */
export function FeedbackTable({
  rows,
  counts,
  canDelete,
}: {
  rows: FeedbackRow[];
  counts: { new: number; reading: number; done: number; wontfix: number; total: number };
  /** 削除は SUPER のみ。押せないボタンを出さないために受け取る。 */
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<"ALL" | FeedbackStatus>("ALL");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const shown = rows.filter((r) => filter === "ALL" || r.status === filter);

  function change(id: string, status: FeedbackStatus, adminNote?: string | null) {
    start(async () => {
      const res = await updateFeedback({ id, status, adminNote: adminNote ?? undefined });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNoteFor(null);
      router.refresh();
    });
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "この報告を削除しますか？",
      body: "元に戻せません。誤送信や中身の無い投稿を片付けるときにお使いください。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteFeedback({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["未読", counts.new],
            ["確認中", counts.reading],
            ["対応済み", counts.done],
            ["見送り", counts.wontfix],
          ] as const
        ).map(([label, n]) => (
          <Card key={label} className="p-3.5">
            <div className="text-[12px] text-text-tertiary">{label}</div>
            <div className="mt-0.5 text-[20px] font-bold tabular-nums">{n}</div>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <Segmented<"ALL" | FeedbackStatus>
          className="w-full"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: `すべて（${counts.total}）` },
            ...STATUSES.map((s) => ({ value: s, label: FEEDBACK_STATUS_LABEL[s] })),
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={28} />}
          title={filter === "ALL" ? "まだ報告はありません" : "この状態の報告はありません"}
          description={
            filter === "ALL"
              ? "利用者が設定から送ると、ここに届きます。"
              : "絞り込みを「すべて」に戻すと、届いているものを確認できます。"
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.kind === "BUG" ? "expense" : "accent"} size="sm">
                  {FEEDBACK_KIND_LABEL[r.kind as FeedbackKind] ?? r.kind}
                </Badge>
                <Badge
                  tone={
                    r.status === "NEW" ? "warning" : r.status === "DONE" ? "income" : "neutral"
                  }
                  size="sm"
                >
                  {FEEDBACK_STATUS_LABEL[r.status as FeedbackStatus] ?? r.status}
                </Badge>
                <span className="ml-auto text-[12px] text-text-tertiary">{r.createdAtLabel}</span>
              </div>

              {/* 本文はそのまま出す。改行も残す。 */}
              <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                {r.body}
              </p>

              <dl className="mt-3 space-y-1 border-t border-border-subtle pt-2.5 text-[12px]">
                <Row label="送り主">
                  {r.userName ?? r.userEmail ?? "退会した方"}
                  {r.userEmail && r.userName ? `（${r.userEmail}）` : ""}
                </Row>
                {r.contactEmail && <Row label="返信先">{r.contactEmail}</Row>}
                {r.fromPath && <Row label="送信元の画面">{r.fromPath}</Row>}
                {r.userAgent && <Row label="端末">{r.userAgent}</Row>}
                {r.appVersion && <Row label="アプリの版">v{r.appVersion}</Row>}
                {r.handledByName && (
                  <Row label="対応">
                    {r.handledByName}
                    {r.handledAtLabel ? ` ・ ${r.handledAtLabel}` : ""}
                  </Row>
                )}
              </dl>

              {r.adminNote && (
                <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-text-secondary">
                  メモ: {r.adminNote}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={r.status}
                  aria-label="対応状況"
                  className="h-11 w-36 text-[13px]"
                  disabled={pending}
                  onChange={(e) => change(r.id, e.target.value as FeedbackStatus, r.adminNote)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FEEDBACK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNoteFor(noteFor === r.id ? null : r.id);
                    setNote(r.adminNote ?? "");
                  }}
                >
                  メモ
                </Button>
                {canDelete && (
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="この報告を削除"
                    className="tap-target ml-auto grid h-9 w-9 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>

              {noteFor === r.id && (
                <div className="mt-2.5 space-y-2">
                  <Textarea
                    value={note}
                    aria-label="対応メモ"
                    placeholder="対応の記録（利用者には見せません）"
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => change(r.id, r.status as FeedbackStatus, note)}
                    disabled={pending}
                  >
                    メモを保存
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-text-tertiary">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
