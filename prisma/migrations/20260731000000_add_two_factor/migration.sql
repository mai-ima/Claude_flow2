-- 二要素認証（TOTP）。
-- 追加のみで既存データに触れないため、切り戻しは列の DROP で足りる。
--   ALTER TABLE "User" DROP COLUMN "twoFactorSecret",
--                      DROP COLUMN "twoFactorEnabledAt",
--                      DROP COLUMN "twoFactorRecoveryCodes";
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "twoFactorRecoveryCodes" JSONB;
