/**
 * ログを消すときの決まりごと（純関数）。
 *
 * ログは放っておくと際限なく増え、本当に見たい行が埋もれる。消せる必要はある。
 * ただし「消せる」の中身は種類によって変える。
 *
 * 自動処理・メール・エラーの記録は、運用のための控えでしかない。
 * 選んで消しても、まとめて消しても困らない。
 *
 * 監査ログだけは違う。あれは「誰が何をしたか」の証跡で、
 * 都合の悪い1件を選んで消せるなら証跡としての意味が無くなる。
 * そこで監査ログは「一定より古いものをまとめて」だけに限り、
 * 理由の入力を必須にし、消したこと自体をまた監査ログに残す。
 */

export const LOG_KINDS = ["CRON", "EMAIL", "ERROR", "AUDIT"] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const LOG_KIND_LABEL: Record<LogKind, string> = {
  CRON: "自動処理の履歴",
  EMAIL: "メール送信の記録",
  ERROR: "エラーの記録",
  AUDIT: "監査ログ",
};

/** 監査ログを消せるようになるまでの日数。これより新しいものは残す。 */
export const AUDIT_MIN_RETENTION_DAYS = 30;

/** 一度に選んで消せる上限。取り違えたときの被害を、ひと画面ぶんに抑える。 */
export const PURGE_MAX_IDS = 500;

export interface PurgeRequest {
  kind: LogKind;
  /** 選んで消す場合の対象。 */
  ids?: string[];
  /** まとめて消す場合の日数。0 なら全件。 */
  olderThanDays?: number;
}

export type PurgeVerdict = { ok: true } | { ok: false; code: string };

/**
 * 消してよいかを判定する。
 *
 * 「選んで消す」と「古いものをまとめて消す」は同時に指定させない。
 * 両方受け付けると、どちらの条件で消えたのかが後から説明できなくなる。
 */
export function checkPurge(req: PurgeRequest, opts: { hasReason: boolean }): PurgeVerdict {
  const bySelection = (req.ids?.length ?? 0) > 0;
  const byAge = req.olderThanDays !== undefined;

  if (!bySelection && !byAge) return { ok: false, code: "PURGE_NO_TARGET" };
  if (bySelection && byAge) return { ok: false, code: "PURGE_AMBIGUOUS" };
  if (bySelection && (req.ids?.length ?? 0) > PURGE_MAX_IDS) {
    return { ok: false, code: "PURGE_TOO_MANY" };
  }

  if (req.kind === "AUDIT") {
    if (bySelection) return { ok: false, code: "AUDIT_NO_SELECTIVE_DELETE" };
    if ((req.olderThanDays ?? 0) < AUDIT_MIN_RETENTION_DAYS) {
      return { ok: false, code: "AUDIT_MIN_RETENTION" };
    }
    if (!opts.hasReason) return { ok: false, code: "REASON_REQUIRED" };
  }

  return { ok: true };
}

/** 「◯日より古い」の境目。日数から実際の日時にする。 */
export function purgeCutoff(olderThanDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000);
}

/** 画面に出す「まとめて消す」の選択肢。 */
export function purgePresets(kind: LogKind): { days: number; label: string }[] {
  if (kind === "AUDIT") {
    return [
      { days: 90, label: "90日より古いものを削除" },
      { days: 180, label: "180日より古いものを削除" },
      { days: 365, label: "1年より古いものを削除" },
    ];
  }
  return [
    { days: 7, label: "7日より古いものを削除" },
    { days: 30, label: "30日より古いものを削除" },
    { days: 90, label: "90日より古いものを削除" },
    { days: 0, label: "すべて削除" },
  ];
}
