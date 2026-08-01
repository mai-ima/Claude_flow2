-- 送り主に見せる返信を持つ。
-- adminNote（内部メモ）とは別の列にする。同じ列を使い回すと、
-- 内部の言葉がそのまま利用者に出る事故がいつか起きる。
ALTER TABLE "Feedback" ADD COLUMN "replyBody" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "repliedAt" TIMESTAMP(3);

-- 管理画面は「種類で絞って新着順」を既定にするため。
CREATE INDEX "Feedback_kind_createdAt_idx" ON "Feedback"("kind", "createdAt");
