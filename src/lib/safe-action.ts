import "server-only";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth";

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
      console.error("[action error]", err);
      const message =
        err instanceof Error && err.message === "FORBIDDEN"
          ? "この操作を行う権限がありません。"
          : "処理に失敗しました。時間をおいて再度お試しください。";
      return fail(message);
    }
  };
}
