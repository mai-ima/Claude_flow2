-- タグと資産スナップショット。
--
-- 追加するもの:
--   1. Tag / TransactionTag  取引に何枚でも貼れる付箋（カテゴリとは別軸）
--   2. AssetSnapshot         月ごとに手で書き留める資産残高
--
-- 既存データへの影響:
--   すべて新規のテーブル。既存の取引・集計・表示は変わらない。
--   タグの付いていない取引は、これまでどおり動く。
--
-- ロールバック:
--   DROP TABLE "TransactionTag";
--   DROP TABLE "Tag";
--   DROP TABLE "AssetSnapshot";

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_ledgerId_name_key" ON "Tag"("ledgerId", "name");

ALTER TABLE "Tag"
  ADD CONSTRAINT "Tag_ledgerId_fkey"
  FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TransactionTag" (
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TransactionTag_pkey" PRIMARY KEY ("transactionId","tagId")
);

CREATE INDEX "TransactionTag_tagId_idx" ON "TransactionTag"("tagId");

ALTER TABLE "TransactionTag"
  ADD CONSTRAINT "TransactionTag_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionTag"
  ADD CONSTRAINT "TransactionTag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssetSnapshot" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetSnapshot_ledgerId_month_key" ON "AssetSnapshot"("ledgerId", "month");
CREATE INDEX "AssetSnapshot_ledgerId_month_idx" ON "AssetSnapshot"("ledgerId", "month");

ALTER TABLE "AssetSnapshot"
  ADD CONSTRAINT "AssetSnapshot_ledgerId_fkey"
  FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
