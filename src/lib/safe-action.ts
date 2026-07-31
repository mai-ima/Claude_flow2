import "server-only";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth";
import { logger } from "./logger";
import { effectiveAdminRole, hasAdminRole, type AdminRole } from "./admin-role";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** ドメイン固有エラーコード → 日本語メッセージ（クライアントはそのまま表示できる）。 */
const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "この操作を行う権限がありません。",
  MEMBER_LIMIT: "現在のプランの人数上限に達しています。",
  USER_NOT_FOUND: "そのメールのユーザーが見つかりません（先に登録が必要です）。",
  CANNOT_REMOVE_OWNER: "オーナーは削除できません。",
  PLAN_REQUIRED: "この機能はプランのアップグレードが必要です。",
  SUB_LIMIT: "フリープランの登録上限です。プラスにすると無制限になります。",
  STRIPE_ACTIVE: "決済が有効なため、この操作はできません。",
  SELF_FORBIDDEN: "自分自身に対しては実行できません。",
  NOT_FOUND: "対象が見つかりません。",
  OWNER_MUST_TRANSFER:
    "あなたはこの帳簿のオーナーです。退出する前に、他のメンバーにオーナーを譲るか帳簿を削除してください。",
  PERSONAL_LEDGER: "個人の家計簿はこの操作の対象外です。",
  NOT_A_MEMBER: "その方はこの帳簿のメンバーではありません。",
  LAST_MEMBER: "自分ひとりの帳簿です。オーナーを譲る相手がいません。",
  NAME_MISMATCH: "帳簿の名前が一致しません。",
  OWNS_SHARED_LEDGER:
    "オーナーになっている共有帳簿があります。先にオーナーを譲るか帳簿を削除してください。",
  ADMIN_FORBIDDEN: "この管理操作を行う権限がありません。",
  REASON_REQUIRED: "理由の入力が必要です。",
  CONFIRM_MISMATCH: "確認の入力が一致しません。",
  IMPERSONATION_READONLY: "他のユーザーとして閲覧中は、変更操作を行えません。",
  INVALID_PASSWORD: "現在のパスワードが正しくありません。",
  WEAK_PASSWORD: "パスワードは8文字以上で入力してください。",
  SAME_PASSWORD: "現在と同じパスワードです。別のものを設定してください。",
  PASSWORD_NOT_SET:
    "このアカウントにはパスワードが設定されていません。ログイン画面の「パスワードをお忘れですか」から設定してください。",
  NO_EMAIL: "メールアドレスが登録されていません。",
  EMAIL_DISABLED: "ただいまメールの送信を準備中のため、この操作はご利用いただけません。",
  EMAIL_SEND_FAILED: "メールを送信できませんでした。時間をおいて再度お試しください。",
  TOO_MANY_REQUESTS: "お申し込みが続いています。しばらく時間をおいてお試しください。",
};

/**
 * 認証 + Zod 検証 + ランタイム例外捕捉を一元化した Server Action ラッパー。
 * これで各 action のボイラープレートと catch 漏れを排除する。
 */
export function authedAction<TSchema extends z.ZodType, TResult>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>, user: SessionUser) => Promise<TResult>,
) {
  return async (rawInput: unknown): Promise<ActionResult<TResult>> => {
    let user: SessionUser;
    try {
      user = await requireUser();
    } catch {
      return fail("ログインが必要です。");
    }

    // 成りすまし中は読み取り専用。管理操作だけでなく、対象ユーザーとしての
    // 通常操作（記録の追加・削除など）も拒否する。閲覧のために入った画面から
    // 他人のデータを書き換えられては意味がない。
    // 閲覧の終了は authedAction を通さない別経路にしてあるため、ここで
    // 一律に止めても抜け出せなくなることはない。
    if (user.impersonatedBy) {
      return fail(ERROR_MESSAGES.IMPERSONATION_READONLY);
    }

    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      return fail("入力内容を確認してください。", flat.fieldErrors as Record<string, string[]>);
    }

    try {
      const data = await handler(parsed.data, user);
      return ok(data);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      const known = ERROR_MESSAGES[code];
      // 想定内のドメインエラー（権限・上限・プラン等）は制御フローであり、
      // error ログ / Sentry へは流さない（監視ノイズを避ける）。
      if (known) return fail(known);
      logger.error("action error", err);
      return fail("処理に失敗しました。時間をおいて再度お試しください。");
    }
  };
}


/**
 * 管理操作用のラッパー。authedAction に「必要な管理権限」の判定を足す。
 *
 * これまでは各 action の先頭で `if (!user.isAdmin) throw` を書き写しており、
 * 新しい action で1行書き忘れれば誰でも実行できる形だった。判定をここに寄せる。
 */
export function adminAction<TSchema extends z.ZodType, TResult>(
  minRole: AdminRole,
  schema: TSchema,
  handler: (input: z.infer<TSchema>, user: SessionUser) => Promise<TResult>,
) {
  return authedAction(schema, async (input, user) => {
    const role = effectiveAdminRole(user.adminRole, user.isAdmin);
    if (!hasAdminRole(role, minRole)) throw new Error("ADMIN_FORBIDDEN");
    // 成りすまし中の拒否は authedAction 側で一律に行っている。
    return handler(input, user);
  });
}
