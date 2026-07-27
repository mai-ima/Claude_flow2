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

/** 足りていない対象（テーブル名・列名）を取り出す。ログ用。 */
export function driftTarget(err: unknown): string {
  const meta = (err as { meta?: Record<string, unknown> } | null)?.meta;
  if (!meta) return "(不明)";
  return String(meta.column ?? meta.table ?? meta.modelName ?? "(不明)");
}
