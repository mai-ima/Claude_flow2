import "server-only";

/**
 * データベースのスキーマがコードより古いことを表すエラーか。
 *
 * P2021 = テーブルが無い / P2022 = 列が無い。
 * 「マイグレーションが適用されないままデプロイされた」状態で必ずこれになる。
 * 生の 500 を返すと画面には何も出ず原因が分からないため、判別できるようにする。
 */
export function isSchemaDrift(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === "P2021" || code === "P2022";
}

export const SCHEMA_DRIFT_MESSAGE =
  "データベースの更新が完了していません。デプロイ時のマイグレーションが実行されたかご確認ください。";

/**
 * データベースにそもそも接続できないことを表すエラーか。
 *
 * P1000 認証失敗 / P1001 到達不能 / P1002 タイムアウト /
 * P1003 データベースが無い / P1010 権限が無い / P1017 接続が閉じられた。
 * 接続文字列の設定漏れや取り違えは全てここに落ちる。
 *
 * スキーマのずれと同じく、生の 500 にすると原因が画面にもログにも残らない。
 * 特にログイン画面がこれで落ちると、利用者は復帰する手段を失う。
 */
export function isDatabaseUnavailable(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string" && /^P10(0[0-3]|10|17)$/.test(code)) return true;
  // 接続情報が無い/壊れている場合はコードの付かない初期化エラーになる。
  return (err as { name?: unknown } | null)?.name === "PrismaClientInitializationError";
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  "データベースに接続できません。接続設定（DATABASE_URL）をご確認ください。";

/** 足りていない対象（テーブル名・列名）を取り出す。ログ用。 */
export function driftTarget(err: unknown): string {
  const meta = (err as { meta?: Record<string, unknown> } | null)?.meta;
  if (!meta) return "(不明)";
  return String(meta.column ?? meta.table ?? meta.modelName ?? "(不明)");
}
