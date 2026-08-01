-- 保存した検索と、初回案内の記録。
--
-- 追加するもの:
--   1. SavedSearch       家計簿の絞り込み条件を名前を付けて保存する
--   2. User.onboardedAt  初回の案内を終えた日時（null なら未案内）
--
-- 既存データへの影響:
--   どちらも新規の追加のみ。既存ユーザーの onboardedAt は NULL になるため、
--   次回のログイン時に案内が1度だけ出る。既存の集計・表示は変わらない。
--
-- ロールバック:
--   DROP TABLE "SavedSearch";
--   ALTER TABLE "User" DROP COLUMN "onboardedAt";

ALTER TABLE "User" ADD COLUMN "onboardedAt" TIMESTAMP(3);

CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedSearch_ledgerId_userId_idx" ON "SavedSearch"("ledgerId", "userId");

ALTER TABLE "SavedSearch"
  ADD CONSTRAINT "SavedSearch_ledgerId_fkey"
  FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedSearch"
  ADD CONSTRAINT "SavedSearch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
