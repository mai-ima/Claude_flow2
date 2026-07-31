import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { Prisma } from "@/generated/prisma";
import {
  generateTotpSecret,
  generateRecoveryCodes,
  normalizeRecoveryCode,
  totpUri,
  verifyTotp,
} from "./totp";

/**
 * 二要素認証の状態管理。
 *
 * 復旧コードはハッシュで持つ。データベースを読めた人がそのまま
 * ログインできてしまっては、二要素にした意味が薄れる。
 */

function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

function storedCodes(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === "string") : [];
}

export interface TwoFactorSetup {
  secret: string;
  /** 認証アプリに読み込ませる文字列。 */
  uri: string;
}

/**
 * 設定を始める。まだ有効化はしない。
 *
 * 鍵は先に保存する。保存せずに画面へ出すだけだと、認証アプリに登録した後で
 * こちらが鍵を忘れ、二度と一致しなくなる。有効化の判定は
 * twoFactorEnabledAt が入っているかどうかで行う。
 */
export async function beginTwoFactorSetup(
  userId: string,
  account: string,
): Promise<TwoFactorSetup> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("NO_ACCOUNT");
  if (user.twoFactorEnabledAt) throw new Error("ALREADY_ENABLED");

  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorRecoveryCodes: Prisma.DbNull },
  });
  return { secret, uri: totpUri(secret, account) };
}

/**
 * 認証アプリのコードを照合して有効化する。
 * 戻り値の復旧コードは、この一度しか表示できない（保存するのはハッシュのため）。
 */
export async function confirmTwoFactor(userId: string, code: string): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("NO_ACCOUNT");
  if (user.twoFactorEnabledAt) throw new Error("ALREADY_ENABLED");
  if (!user.twoFactorSecret) throw new Error("SETUP_NOT_STARTED");
  if (!verifyTotp(user.twoFactorSecret, code)) throw new Error("INVALID_CODE");

  const codes = generateRecoveryCodes();
  await db.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorRecoveryCodes: codes.map(hashRecoveryCode),
    },
  });
  return codes;
}

/**
 * 解除。パスワードの確認は呼び出し側で済ませておくこと
 * （端末を借りられただけで外せてしまわないように）。
 */
export async function disableTwoFactor(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      // undefined は Prisma では「変更しない」。null 相当にするには DbNull を渡す。
      // undefined のままだと、解除しても古い復旧コードが残り続けていた。
      twoFactorRecoveryCodes: Prisma.DbNull,
    },
  });
}

/** 復旧コードを作り直す。古いものは使えなくなる。 */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabledAt) throw new Error("NOT_ENABLED");
  const codes = generateRecoveryCodes();
  await db.user.update({
    where: { id: userId },
    data: { twoFactorRecoveryCodes: codes.map(hashRecoveryCode) },
  });
  return codes;
}

export interface TwoFactorCheck {
  ok: boolean;
  /** 復旧コードで通した場合。残数の案内に使う。 */
  usedRecoveryCode: boolean;
  remainingRecoveryCodes: number;
}

/**
 * ログイン第2段の照合。認証アプリのコード、または復旧コードを受け付ける。
 * 復旧コードは使い切りなので、通ったらその場で消す。
 */
export async function checkSecondFactor(
  userId: string,
  input: string,
): Promise<TwoFactorCheck> {
  const user = await db.user.findUnique({ where: { id: userId } });
  const codes = storedCodes(user?.twoFactorRecoveryCodes);
  const fail = { ok: false, usedRecoveryCode: false, remainingRecoveryCodes: codes.length };

  if (!user?.twoFactorEnabledAt || !user.twoFactorSecret) return fail;

  if (verifyTotp(user.twoFactorSecret, input)) {
    return { ok: true, usedRecoveryCode: false, remainingRecoveryCodes: codes.length };
  }

  const given = hashRecoveryCode(input);
  const remaining = codes.filter((stored) => {
    const a = Buffer.from(stored);
    const b = Buffer.from(given);
    return !(a.length === b.length && timingSafeEqual(a, b));
  });
  if (remaining.length === codes.length) return fail;

  await db.user.update({
    where: { id: userId },
    data: { twoFactorRecoveryCodes: remaining },
  });
  return { ok: true, usedRecoveryCode: true, remainingRecoveryCodes: remaining.length };
}

/** 設定画面用の状態。 */
export async function twoFactorStatus(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return {
    enabled: Boolean(user?.twoFactorEnabledAt),
    enabledAt: user?.twoFactorEnabledAt ?? null,
    remainingRecoveryCodes: storedCodes(user?.twoFactorRecoveryCodes).length,
  };
}
