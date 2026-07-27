import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./default-categories";
import { parseBetaFeatures, type BetaFeatureKey } from "./beta-features";
import { effectiveAdminRole, hasAdminRole, type AdminRole } from "./admin-role";
import { isSchemaDrift, driftTarget } from "./schema-drift";
import { logger } from "./logger";
import { hashPassword, verifyPassword } from "./password";

const SESSION_COOKIE = "tsumiki_session";
const SESSION_DAYS = 30;
/** 成りすまし前の管理者セッションを退避しておく Cookie。 */
const IMPERSONATION_RETURN_COOKIE = "tsumiki_return_session";

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  themePref: string;
  currency: string;
  assumedHourlyWage: number | null;
  tier: string;
  isAdmin: boolean;
  /** 管理権限の粒度。isAdmin は後方互換で併存する。 */
  adminRole: string;
  /** 成りすまし中なら、閲覧している管理者のID。読み取り専用の目印。 */
  impersonatedBy: string | null;
  betaOptIn: boolean;
  /** 個別に有効化したベータ機能。null は未指定（親スイッチに従い全て有効）。 */
  betaFeatures: BetaFeatureKey[] | null;
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
  | "NO_ACCOUNT"
  | "PASSWORD_NOT_SET";

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

  let user;
  try {
    user = await db.user.findUnique({ where: { email: normalized } });
  } catch (err) {
    // 列が足りない = マイグレーション未適用。
    // 「ログインに失敗しました」で片付けると原因に辿り着けない。
    if (isSchemaDrift(err)) {
      logger.error("schema drift", err, { missing: driftTarget(err) });
      throw new Error("SCHEMA_DRIFT");
    }
    throw err;
  }

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
    // パスワード未設定のアカウント（OAuth 等で作成）に対して、任意のパスワードで
    // ログインさせてはならない（そのまま乗っ取りになる）。照合は必ず行い、
    // 未設定なら別経路（パスワード再設定）へ誘導する。
    if (!user.passwordHash) throw new Error("PASSWORD_NOT_SET");
    if (!verifyPassword(password, user.passwordHash)) {
      throw new Error("INVALID_PASSWORD");
    }
    // 凍結中はセッションを発行しない。理由は画面側で案内する。
    if (user.suspendedAt) throw new Error("ACCOUNT_SUSPENDED");
  }
  await bootstrapUser(user.id, user.name);
  await establishSession(user.id);
  return user;
}

/**
 * セッション発行 + Cookie 設定（期限切れの掃除込み）。
 * impersonatedBy を渡すと「管理者が別ユーザーとして閲覧中」の印がつき、
 * そのセッションからの変更操作は adminAction 側で拒否される。
 */
async function establishSession(userId: string, impersonatedBy?: string) {
  await db.session.deleteMany({
    where: { userId, expires: { lt: new Date() } },
  });
  const token = randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + (impersonatedBy ? 60 * 60 * 1000 : SESSION_DAYS * 24 * 60 * 60 * 1000),
  );
  const h = await headers().catch(() => null);
  await db.session.create({
    data: {
      sessionToken: token,
      userId,
      expires,
      impersonatedBy,
      ip: h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      userAgent: h?.get("user-agent")?.slice(0, 300) ?? undefined,
    },
  });

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

/**
 * 現在のログインユーザー。未ログインは null。
 * React cache() で 1 リクエスト内の重複クエリを排除（layout・page・action で
 * 複数回呼ばれてもセッション取得は 1 回に集約される）。
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let session;
  try {
    session = await db.session.findUnique({
      where: { sessionToken: token },
      include: { user: { include: { billing: true } } },
    });
  } catch (err) {
    // マイグレーション未適用のままデプロイされると、ここが列不足で落ちて
    // 画面には内容のない 500 だけが出る。原因が分かる形でログに残す。
    if (isSchemaDrift(err)) {
      logger.error("schema drift", err, { missing: driftTarget(err) });
      throw new Error("SCHEMA_DRIFT");
    }
    throw err;
  }
  if (!session) return null;
  if (session.expires < new Date()) {
    // 期限切れセッションは破棄
    await db.session.deleteMany({ where: { sessionToken: token } });
    return null;
  }

  const u = session.user;
  // 凍結中は「ログインしていない」として扱う。
  // 画面ごとに判定を書くと必ずどこかで漏れるため、入口で止める。
  if (u.suspendedAt) return null;

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    themePref: u.themePref,
    currency: u.currency,
    assumedHourlyWage: u.assumedHourlyWage,
    tier: u.billing?.tier ?? "FREE",
    isAdmin: u.isAdmin,
    adminRole: u.adminRole,
    impersonatedBy: session.impersonatedBy,
    betaOptIn: u.betaOptIn,
    betaFeatures: parseBetaFeatures(u.betaFeatures),
  };
});

/** 認証必須箇所で使用。未ログインは throw。 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** 管理者必須。未ログイン/非管理者は throw。 */
/**
 * 管理画面用。既定は「閲覧できること」を要求する。
 * 変更操作は adminAction(minRole) 側で別途判定する（画面が開ける = 何でもできる、にしない）。
 */
export async function requireAdmin(minRole: AdminRole = "READONLY"): Promise<SessionUser> {
  const user = await requireUser();
  const role = effectiveAdminRole(user.adminRole, user.isAdmin);
  if (!hasAdminRole(role, minRole)) throw new Error("FORBIDDEN");
  return user;
}


/**
 * 管理者が対象ユーザーとして閲覧を開始する（読み取り専用）。
 * 元の管理者セッションは残さず、終了時にログインし直してもらう
 * ——ではなく、戻れないと運用が回らないため、元のトークンを別 Cookie に退避する。
 */
export async function startImpersonation(targetUserId: string, adminId: string) {
  const store = await cookies();
  const current = store.get(SESSION_COOKIE)?.value;
  if (current) {
    store.set(IMPERSONATION_RETURN_COOKIE, current, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
  }
  await establishSession(targetUserId, adminId);
}

/** 閲覧を終了し、元の管理者セッションへ戻る。 */
export async function endImpersonation() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { sessionToken: token } });

  const back = store.get(IMPERSONATION_RETURN_COOKIE)?.value;
  if (back) {
    store.set(SESSION_COOKIE, back, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    store.delete(IMPERSONATION_RETURN_COOKIE);
  } else {
    store.delete(SESSION_COOKIE);
  }
}
