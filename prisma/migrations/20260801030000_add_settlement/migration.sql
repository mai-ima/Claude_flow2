-- 共有帳簿の精算。
--
-- 追加するもの:
--   1. LedgerMember.shareRatio  負担の重み（既定 1 = 全員均等）
--   2. Transaction.paidByUserId 実際に払った人（記録者とは限らない）
--   3. Settlement               「誰が誰にいくら渡したか」の記録
--
-- 既存データへの影響:
--   shareRatio は既定値 1 で埋まるため、いまの帳簿は全員均等のままになる。
--   paidByUserId は NULL のままで、精算の対象外＝立て替え無しとして扱う。
--   どちらも既存の集計・表示を変えない。
--
-- ロールバック:
--   DROP TABLE "Settlement";
--   DROP INDEX "Transaction_ledgerId_paidByUserId_idx";
--   ALTER TABLE "Transaction" DROP COLUMN "paidByUserId";
--   ALTER TABLE "LedgerMember" DROP COLUMN "shareRatio";
--   （role に入れた 'SELF_EDITOR' は文字列列のため型としては残る。
--     戻すなら UPDATE "LedgerMember" SET "role" = 'VIEWER' WHERE "role" = 'SELF_EDITOR';）

ALTER TABLE "LedgerMember" ADD COLUMN "shareRatio" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Transaction" ADD COLUMN "paidByUserId" TEXT;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_paidByUserId_fkey"
  FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Transaction_ledgerId_paidByUserId_idx" ON "Transaction"("ledgerId", "paidByUserId");

CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "amount" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Settlement_ledgerId_settledAt_idx" ON "Settlement"("ledgerId", "settledAt");

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_ledgerId_fkey"
  FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_toUserId_fkey"
  FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
