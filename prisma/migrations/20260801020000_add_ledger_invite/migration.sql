-- 招待。未登録の相手にも送れるようにする。
--
-- これまでは inviteMember が登録済みユーザーしか受け付けず、
-- 「まず自分で登録してもらってから招待する」しかなかった。
--
-- token はハッシュで保存する。招待リンクは帳簿への入場券そのものなので、
-- データベースを読める人がそのまま使えては困る。
--
-- 切り戻し: DROP TABLE "LedgerInvite";
CREATE TABLE "LedgerInvite" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerInvite_token_key" ON "LedgerInvite"("token");
CREATE INDEX "LedgerInvite_ledgerId_idx" ON "LedgerInvite"("ledgerId");
-- 同じ宛先の保留中の招待を探すため。
CREATE INDEX "LedgerInvite_email_idx" ON "LedgerInvite"("email");

ALTER TABLE "LedgerInvite" ADD CONSTRAINT "LedgerInvite_ledgerId_fkey"
  FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- 招待した人が退会しても招待は残す（誰が送ったかが分からなくなるだけ）。
ALTER TABLE "LedgerInvite" ADD CONSTRAINT "LedgerInvite_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
