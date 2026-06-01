import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./default-categories";
import { hashPassword, verifyPassword } from "./password";

const SESSION_COOKIE = "tsumiki_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  themePref: string;
  currency: string;
  assumedHourlyWage: number | null;
  tier: string;
};

/** 新規ユーザーの初期データ（個人帳簿・メンバー・課金プロフィール・既定カテゴリ）を用意。 */
async function bootstrapUser(userId: string, name: string | null) {
  const existing = await db.ledger.findFirst({
    where: { ownerId: userId, type: "PERSONAL" },
  });
  if (existing) return;

  const ledger = await db.ledger.create({
    data: {
      name: name ? `${name}の家計簿` : "わたしの家計簿",
      type: "PERSONAL",
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, ledgerId: ledger.id })),
  });

  await db.billingProfile.upsert({
    where: { userId },
    create: { userId, tier: "FREE" },
    update: {},
  });
}

export type AuthError =
  | "INVALID_PASSWORD"
  | "WEAK_PASSWORD"
  | "EMAIL_TAKEN"
  | "NO_ACCOUNT";

/**
 * メール + パスワードでサインイン / 新規登録。
 * - mode "signup": 既存メールは EMAIL_TAKEN。新規作成。
 * - mode "login":  未登録は NO_ACCOUNT。パスワード照合（不一致は INVALID_PASSWORD）。
 *   レガシー(パスワード未設定)アカウントは初回ログインでパスワードを設定。
 */
export async function signInWithEmail(
  email: string,
  password: string,
  opts: { name?: string; mode?: "login" | "signup" } = {},
) {
  const { name, mode = "login" } = opts;
  const normalized = email.trim().toLowerCase();
  if (password.length < 8) {
    throw new Error("WEAK_PASSWORD");
  }

  let user = await db.user.findUnique({ where: { email: normalized } });

  if (mode === "signup") {
    if (user) throw new Error("EMAIL_TAKEN");
    user = await db.user.create({
      data: {
        email: normalized,
        name: name?.trim() || normalized.split("@")[0],
        passwordHash: hashPassword(password),
      },
    });
  } else {
    if (!user) throw new Error("NO_ACCOUNT");
    if (user.passwordHash) {
      if (!verifyPassword(password, user.passwordHash)) {
        throw new Error("INVALID_PASSWORD");
      }
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }
  }
  await bootstrapUser(user.id, user.name);
  await establishSession(user.id);
  return user;
}

/** セッション発行 + Cookie 設定（期限切れの掃除込み）。 */
export async function establishSession(userId: string) {
  await db.session.deleteMany({
    where: { userId, expires: { lt: new Date() } },
  });
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { sessionToken: token, userId, expires } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

/** デモアカウントでログイン（データが無ければ自動で投入）。 */
export async function loginAsDemo() {
  const { seedDemo, DEMO_EMAIL } = await import("./seed-demo");
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    await seedDemo();
    user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  }
  if (!user) throw new Error("DEMO_SEED_FAILED");
  await establishSession(user.id);
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { sessionToken: token } });
    store.delete(SESSION_COOKIE);
  }
}

/** 現在のログインユーザー。未ログインは null。 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: { user: { include: { billing: true } } },
  });
  if (!session) return null;
  if (session.expires < new Date()) {
    // 期限切れセッションは破棄
    await db.session.deleteMany({ where: { sessionToken: token } });
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    themePref: u.themePref,
    currency: u.currency,
    assumedHourlyWage: u.assumedHourlyWage,
    tier: u.billing?.tier ?? "FREE",
  };
}

/** 認証必須箇所で使用。未ログインは throw。 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
