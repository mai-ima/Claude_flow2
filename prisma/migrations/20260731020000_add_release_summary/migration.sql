-- リリースノートの通常版（要点のみ）。
-- 既存の sections は詳細版として残す。null の版は切り替えを出さない。
-- 切り戻し: ALTER TABLE "ReleaseNote" DROP COLUMN "summary";
ALTER TABLE "ReleaseNote" ADD COLUMN "summary" JSONB;
