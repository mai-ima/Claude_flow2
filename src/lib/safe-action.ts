import "server-only";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth";
import { logger } from "./logger";

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

    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      return fail("入力内容を確認してください。", flat.fieldErrors as Record<string, string[]>);
    }

    try {
      const data = await handler(parsed.data, user);
      return ok(data);
    } catch (err) {
      logger.error("action error", err);
      const code = err instanceof Error ? err.message : "";
      const message =
        ERROR_MESSAGES[code] ?? "処理に失敗しました。時間をおいて再度お試しください。";
      return fail(message);
    }
  };
}
