"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TrashIcon } from "@/components/icons";
import { purgeLogs } from "../log-actions";
import { LOG_KIND_LABEL, purgePresets, type LogKind } from "../log-purge";

/**
 * 1行ぶんの表示。
 *
 * 自動処理・メール・エラー・監査ログは中身が違うが、画面での読み方は同じ
 * （何が・どうなって・いつ）。呼ぶ側でこの形に均してから渡す。
 * 種類ごとに似た一覧を4つ書くと、直すときに1つ書き漏らす。
 */
export interface LogItem {
  id: string;
  /** 主語。ジョブ名・宛先・エラーの一文など。 */
  title: string;
  /** 状態の語（成功／失敗など）。色は tone で決める。 */
  status?: string;
  tone?: "ok" | "bad" | "warn" | "muted";
  /** 補足の小さな語。実行のきっかけ、種類など。 */
  chips?: string[];
  /** 右端に出す日時。 */
  time: string;
  /** 2行目。件名や実行者など。 */
  sub?: string;
  /** 人が書いた文。理由メモなど。 */
  note?: string;
  /** 機械が出した文。エラー本文や差分。等幅で折り返す。 */
  detail?: string;
}

const TONE: Record<NonNullable<LogItem["tone"]>, string> = {
  ok: "text-income",
  bad: "text-expense",
  warn: "text-warning",
  muted: "text-text-tertiary",
};

export function LogSection({
  title,
  description,
  kind,
  items,
  total,
  canPurge,
  emptyText,
  children,
}: {
  title: string;
  description?: string;
  kind: LogKind;
  items: LogItem[];
  /** 全体の件数。表示しているのは一部なので、消す前に規模が分かるようにする。 */
  total: number;
  /** 削除できるか（全権のみ）。押せないボタンは出さない。 */
  canPurge: boolean;
  emptyText: string;
  /** 見出しの右に置く操作（手動実行など）。 */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reason, setReason] = useState("");

  // 監査ログは1件ずつ選べない（証跡なので、都合の悪い1件だけを
  // 消せる形にしない）。選択の枠自体を出さないことで、押してから
  // 断られるより先に分かるようにする。
  const selectable = canPurge && kind !== "AUDIT";
  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(req: { ids?: string[]; olderThanDays?: number }, label: string) {
    start(async () => {
      const res = await purgeLogs({ kind, ...req, reason: reason.trim() || undefined });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSelected(new Set());
      setBulkOpen(false);
      setReason("");
      toast.success(
        res.data.deleted === 0 ? "削除するものはありませんでした。" : `${label}（${res.data.deleted}件）`,
      );
      router.refresh();
    });
  }

  async function purgeSelected() {
    const ids = [...selected];
    const ok = await confirm({
      title: `選択した${ids.length}件を削除しますか？`,
      body: "元に戻せません。記録が消えるだけで、アプリの動きには影響しません。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    run({ ids }, "削除しました");
  }

  async function purgeOlder(days: number, label: string) {
    if (kind === "AUDIT" && reason.trim().length === 0) {
      toast.error("監査ログを削除するときは理由の入力が必要です。");
      return;
    }
    const ok = await confirm({
      title: label.replace("削除", "削除しますか？"),
      body:
        kind === "AUDIT"
          ? "監査ログは管理操作の証跡です。削除したこと自体も記録に残ります。"
          : "元に戻せません。記録が消えるだけで、アプリの動きには影響しません。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    run({ olderThanDays: days }, "削除しました");
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] tabular-nums text-text-secondary">
          {total.toLocaleString("ja-JP")}件
        </span>
        <div className="ml-auto flex items-center gap-2">
          {children}
          {canPurge && total > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setBulkOpen(true)}>
              まとめて削除
            </Button>
          )}
        </div>
      </div>

      {description && <p className="text-[12px] text-text-secondary">{description}</p>}

      {selectable && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <label className="tap-target flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={allSelected}
              aria-label="表示中をすべて選択"
              onChange={() =>
                setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
              }
              className="h-4 w-4 accent-[var(--color-accent-solid)]"
            />
            表示中をすべて選択
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-text-tertiary">{selected.size}件を選択中</span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={purgeSelected}>
                <TrashIcon size={14} /> 選択した{selected.size}件を削除
              </Button>
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-text-secondary">
          {emptyText}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex gap-2.5 border-t border-border-subtle px-4 py-3 text-[13px] first:border-t-0"
            >
              {selectable && (
                <input
                  type="checkbox"
                  checked={selected.has(it.id)}
                  aria-label={`${it.title} を選択`}
                  onChange={() => toggle(it.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent-solid)]"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium break-words">{it.title}</span>
                  {it.status && <span className={TONE[it.tone ?? "muted"]}>{it.status}</span>}
                  {it.chips?.map((c) => (
                    <span key={c} className="text-text-tertiary">
                      {c}
                    </span>
                  ))}
                  <span className="ml-auto shrink-0 tabular-nums text-text-tertiary">{it.time}</span>
                </div>
                {it.sub && <div className="mt-0.5 break-words text-[12px] text-text-tertiary">{it.sub}</div>}
                {it.note && <div className="mt-1 break-words">{it.note}</div>}
                {it.detail && (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-text-secondary">
                    {it.detail}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={bulkOpen} onClose={() => setBulkOpen(false)} title={`${LOG_KIND_LABEL[kind]}の削除`}>
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
            いま {total.toLocaleString("ja-JP")} 件あります。
            {kind === "AUDIT"
              ? "監査ログは管理操作の証跡です。削除できるのは最高責任者のみで、30日より新しいものは削除できません。削除したこと自体も記録に残ります。"
              : "運用のための控えなので、消してもアプリの動きには影響しません。"}
          </p>

          {kind === "AUDIT" && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" htmlFor="purge-reason">
                削除する理由
              </label>
              <Textarea
                id="purge-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 保存期間（1年）を過ぎた記録の整理"
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            {purgePresets(kind).map((p) => (
              <Button
                key={p.days}
                full
                variant={p.days === 0 ? "ghost" : "tinted"}
                disabled={pending}
                onClick={() => purgeOlder(p.days, p.label)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </Sheet>
    </section>
  );
}
