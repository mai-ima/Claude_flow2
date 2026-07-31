import "server-only";
import { cookies } from "next/headers";
import { issueToken, peekToken, consumeToken } from "./verification-token";

/**
 * 「パスワードは通ったが、2段目がまだ」の状態を持ち回すための Cookie。
 *
 * 中身は使い捨てトークンで、対応する userId はサーバー側にしか無い。
 * Cookie に userId をそのまま入れると、書き換えるだけで他人になれてしまう。
 */
const CHALLENGE_COOKIE = "tsumiki_2fa";

export async function startTwoFactorChallenge(userId: string) {
  const token = await issueToken("twofa", userId);
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

/** 照合待ちのユーザー。無効・期限切れなら null。 */
export async function pendingTwoFactorUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  // ここでは消さない。コードを打ち間違えるたびに
  // ログインからやり直しになるのを避ける。
  return peekToken("twofa", token);
}

/** 通過したので後始末する。トークンは使い切りにする。 */
export async function finishTwoFactorChallenge() {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  if (token) await consumeToken("twofa", token);
  store.delete(CHALLENGE_COOKIE);
}
