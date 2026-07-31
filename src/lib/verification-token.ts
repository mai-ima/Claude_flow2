import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";

/**
 * 使い捨てトークン（パスワード再設定・メールアドレス確認）。
 *
 * 保存するのはハッシュだけ。データベースを読める人がそのままトークンを
 * 使い回せる状態にしない（再設定トークンは事実上パスワードと同じ強さを持つ）。
 * 生の値はメールに載せた一度きりで、こちらには残らない。
 */

export type TokenPurpose = "reset" | "verify";

/** 用途ごとの有効期限。短いほうが安全だが、短すぎるとメールを開く前に切れる。 */
const TTL_MINUTES: Record<TokenPurpose, number> = {
  reset: 60,
  verify: 60 * 24,
};

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function keyFor(purpose: TokenPurpose, identifier: string): string {
  return `${purpose}:${identifier.trim().toLowerCase()}`;
}

/**
 * トークンを発行して生の値を返す。
 * 同じ用途の古いトークンは破棄する（再送のたびに使える鍵が増えないように）。
 */
export async function issueToken(
  purpose: TokenPurpose,
  identifier: string,
): Promise<string> {
  const key = keyFor(purpose, identifier);
  await db.verificationToken.deleteMany({ where: { identifier: key } });

  const raw = randomBytes(32).toString("base64url");
  await db.verificationToken.create({
    data: {
      identifier: key,
      token: hash(raw),
      expires: new Date(Date.now() + TTL_MINUTES[purpose] * 60 * 1000),
    },
  });
  return raw;
}

/**
 * トークンを検証して、対応する識別子（メールアドレス）を返す。
 * 一度使ったら消す。無効・期限切れは null。
 */
export async function consumeToken(
  purpose: TokenPurpose,
  raw: string,
): Promise<string | null> {
  if (!raw) return null;
  const hashed = hash(raw);
  const row = await db.verificationToken.findUnique({ where: { token: hashed } });
  if (!row) return null;

  // 用途をまたいだ使い回しを防ぐ。確認用トークンで再設定できてはいけない。
  const prefix = `${purpose}:`;
  if (!row.identifier.startsWith(prefix)) return null;

  // 期限切れでも記録は消す（残しても使い道が無い）。
  await db.verificationToken.deleteMany({ where: { token: hashed } });
  if (row.expires < new Date()) return null;

  // findUnique で引けている時点で一致しているが、比較の形を揃えておく。
  const a = Buffer.from(row.token);
  const b = Buffer.from(hashed);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return row.identifier.slice(prefix.length);
}

/** 期限切れトークンの掃除。定期実行から呼ぶ。 */
export async function purgeExpiredTokens(): Promise<number> {
  const { count } = await db.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  return count;
}
