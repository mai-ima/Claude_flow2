-- 自動記帳・自動積立の重複防止キー。
--
-- これまでは「同じ日の記帳が既にあるか」を調べてから作っていた。
-- cron が重なると、双方が「無い」と判断して二重に計上され得る。
-- 一意制約を置き、2件目を DB 側で弾く。
--
-- 列は NULL 許容にする。手入力の取引・積立は NULL のままで、
-- PostgreSQL では NULL 同士は衝突しないため、
-- 「同じサブスクの同じ日に手でもう1件足す」は今まで通りできる。
--
-- 切り戻し:
--   DROP INDEX "Transaction_autoKey_key";
--   DROP INDEX "GoalContribution_autoKey_key";
--   ALTER TABLE "Transaction" DROP COLUMN "autoKey";
--   ALTER TABLE "GoalContribution" DROP COLUMN "autoKey";
ALTER TABLE "Transaction" ADD COLUMN "autoKey" TEXT;
ALTER TABLE "GoalContribution" ADD COLUMN "autoKey" TEXT;

CREATE UNIQUE INDEX "Transaction_autoKey_key" ON "Transaction"("autoKey");
CREATE UNIQUE INDEX "GoalContribution_autoKey_key" ON "GoalContribution"("autoKey");
