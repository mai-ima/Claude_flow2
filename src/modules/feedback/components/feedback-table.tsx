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
import { BellIcon, TrashIcon, DownloadIcon } from "@/components/icons";
import { dateKeyJST } from "@/lib/date";
import {
  updateFeedback,
  deleteFeedback,
  replyFeedback,
  bulkUpdateFeedback,
} from "../actions";
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
  replyBody: string | null;
  repliedAtLabel: string | null;
  handledByName: string | null;
  handledAtLabel: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAtLabel: string;
}

const STATUSES: FeedbackStatus[] = ["NEW", "READING", "DONE", "WONTFIX"];

/** CSV の1セル。改行とカンマと引用符を含みうるので必ず括る。 */
function cell(v: string | null): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

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
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shown = rows.filter((r) => filter === "ALL" || r.status === filter);
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  function sendReply(id: string, status: FeedbackStatus) {
    const text = reply.trim();
    if (text.length === 0) {
      toast.error("返信の内容を入力してください。");
      return;
    }
    start(async () => {
      const res = await replyFeedback({ id, replyBody: text, status });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReplyFor(null);
      setReply("");
      toast.success("返信しました。アプリ内の通知と、返信先が入力されていればメールで届きます。");
      router.refresh();
    });
  }

  async function bulk(status: FeedbackStatus) {
    const ids = [...selected];
    const ok = await confirm({
      title: `選択した${ids.length}件を「${FEEDBACK_STATUS_LABEL[status]}」にしますか？`,
      body: "対応状況だけを変えます。送り主への返信は送られません。",
      confirmText: "変更する",
    });
    if (!ok) return;
    start(async () => {
      const res = await bulkUpdateFeedback({ ids, status });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSelected(new Set());
      toast.success(`${res.data.updated}件を変更しました。`);
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

  /** いま表示している範囲を CSV で書き出す。集計や共有は表計算のほうが早い。 */
  function exportCsv() {
    const header = [
      "受付日時",
      "種類",
      "対応状況",
      "本文",
      "送り主",
      "返信先",
      "送信元の画面",
      "端末",
      "アプリの版",
      "返信",
      "内部メモ",
    ];
    const lines = [
      header.join(","),
      ...shown.map((r) =>
        [
          cell(r.createdAtLabel),
          cell(FEEDBACK_KIND_LABEL[r.kind as FeedbackKind] ?? r.kind),
          cell(FEEDBACK_STATUS_LABEL[r.status as FeedbackStatus] ?? r.status),
          cell(r.body),
          cell(r.userName ?? r.userEmail ?? "退会した方"),
          cell(r.contactEmail),
          cell(r.fromPath),
          cell(r.userAgent),
          cell(r.appVersion),
          cell(r.replyBody),
          cell(r.adminNote),
        ].join(","),
      ),
    ];
    // Excel が UTF-8 と判断できるよう BOM を付ける。付けないと日本語が化ける。
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${dateKeyJST(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["未対応", counts.new],
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

      <div className="mb-3">
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

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
        {shown.length > 0 && (
          <label className="tap-target flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={allShownSelected}
              aria-label="表示中をすべて選択"
              onChange={() =>
                setSelected(allShownSelected ? new Set() : new Set(shown.map((r) => r.id)))
              }
              className="h-4 w-4 accent-[var(--color-accent-solid)]"
            />
            表示中をすべて選択
          </label>
        )}
        {selected.size > 0 && (
          <>
            <span className="text-text-tertiary">{selected.size}件を選択中</span>
            {(["READING", "DONE", "WONTFIX"] as const).map((s) => (
              <Button key={s} size="sm" variant="ghost" disabled={pending} onClick={() => bulk(s)}>
                {FEEDBACK_STATUS_LABEL[s]}にする
              </Button>
            ))}
          </>
        )}
        {shown.length > 0 && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={exportCsv}>
            <DownloadIcon size={14} /> CSVで書き出す
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={28} />}
          title={filter === "ALL" ? "まだ報告はありません" : "この状態の報告はありません"}
          description={
            filter === "ALL"
              ? "利用者が設定から送ると、ここに届きます。"
              : "絞り込みを「すべて」に戻すと、届いているものを確認いただけます。"
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  aria-label="この報告を選択"
                  onChange={() => toggle(r.id)}
                  className="h-4 w-4 accent-[var(--color-accent-solid)]"
                />
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
                {r.replyBody && (
                  <Badge tone="accent" size="sm">
                    返信済み
                  </Badge>
                )}
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

              {r.replyBody && (
                <div className="mt-2.5 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2">
                  <div className="text-[11px] font-semibold text-accent">
                    送り主に見せている返信
                    {r.repliedAtLabel ? ` ・ ${r.repliedAtLabel}` : ""}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed">
                    {r.replyBody}
                  </p>
                </div>
              )}

              {r.adminNote && (
                <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-text-secondary">
                  メモ（送り主には見せません）: {r.adminNote}
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
                  variant="tinted"
                  onClick={() => {
                    setReplyFor(replyFor === r.id ? null : r.id);
                    setReply(r.replyBody ?? "");
                  }}
                >
                  {r.replyBody ? "返信を直す" : "返信する"}
                </Button>
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

              {replyFor === r.id && (
                <div className="mt-2.5 space-y-2 rounded-xl border border-accent/25 bg-accent/5 p-3">
                  <p className="text-[11px] leading-relaxed text-text-secondary">
                    ここに書いた文は送り主にそのまま届きます（アプリ内の通知と、
                    {r.contactEmail ? `メール ${r.contactEmail}` : "返信先の記入が無いためメールは送られません"}
                    ）。内部の記録は「メモ」にご記入ください。
                  </p>
                  <Textarea
                    value={reply}
                    aria-label="送り主への返信"
                    placeholder="例: ご報告ありがとうございます。ご指摘の不具合を修正し、次回の更新で反映します。"
                    rows={4}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={pending} onClick={() => sendReply(r.id, "DONE")}>
                      返信して対応済みにする
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => sendReply(r.id, "READING")}
                      title="途中経過を伝えるとき"
                    >
                      返信して確認中のままにする
                    </Button>
                  </div>
                </div>
              )}

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
