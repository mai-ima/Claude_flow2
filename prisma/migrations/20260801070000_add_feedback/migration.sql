-- 利用者からの要望・不具合の報告。
--
-- 送った本人は残すが、退会しても内容は消さない（SetNull）。
-- 1件の報告が他の人の困りごとでもあることは多く、送り主が抜けたからといって
-- 無かったことにはならない。
--
-- 既存データへの影響: 新規のテーブルのみ。既存の動作は変わらない。
--
-- ロールバック:
--   DROP TABLE "Feedback";

CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OTHER',
    "body" TEXT NOT NULL,
    "contactEmail" TEXT,
    "fromPath" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_handledByUserId_fkey"
  FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
