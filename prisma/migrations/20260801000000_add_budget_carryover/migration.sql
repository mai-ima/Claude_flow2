-- 予算の繰り越し。前月の使い残しを当月に足すかどうか。
-- 既定は false なので、既存の予算の見え方は変わらない。
-- 切り戻し: ALTER TABLE "Budget" DROP COLUMN "carryOver";
ALTER TABLE "Budget" ADD COLUMN "carryOver" BOOLEAN NOT NULL DEFAULT false;
