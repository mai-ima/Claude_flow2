/**
 * このコードが動くために必要なマイグレーションの一覧。
 *
 * 実行中のサーバーからは prisma/migrations フォルダが見えない
 * （デプロイ時のバンドルに含まれない）ため、名前だけをここに持つ。
 * 中身がずれないよう expected-migrations.test.ts が実フォルダと突き合わせる。
 *
 * 用途は /api/health の自己診断。データベースに適用済みの記録と
 * この一覧を比べれば、「新しいコード × 古いデータベース」を
 * 画面を触らずに判別できる。
 */
export const EXPECTED_MIGRATIONS = [
  "0_init",
  "20260727000000_add_user_beta_features",
  "20260727010000_keep_records_when_member_leaves",
  "20260727020000_add_audit_log_and_admin_role",
  "20260727030000_extend_session",
  "20260727040000_add_ops_tables",
  "20260727050000_add_user_suspension",
  "20260727060000_add_content_and_flag_tables",
  "20260731000000_add_two_factor",
  "20260731010000_add_auto_post_idempotency",
  "20260731020000_add_release_summary",
] as const;
