-- 添付ファイル（レシートの写真など）。
--
-- 実体は外部のファイル置き場に置き、この表には場所と素性だけを持つ。
-- 置き場（BLOB_READ_WRITE_TOKEN）が未設定の環境では、この表は空のままで
-- 画面にも欄が出ない。既存の動作には影響しない。
--
-- ロールバック:
--   DROP TABLE "Attachment";
--   （置き場に残ったファイルは別途削除が必要。表を消しても実体は消えない）

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachment_transactionId_idx" ON "Attachment"("transactionId");

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
