import "server-only";
import { isSentryEnabled } from "./env";
import { recordError } from "./ops-log";

type Meta = Record<string, unknown>;

/**
 * 構造化ログの薄いラッパー。
 * SENTRY_DSN が設定され、かつ `@sentry/nextjs` を導入済み（グローバルに
 * Sentry を公開）の場合は error を転送する。未導入なら console のみ（env 差込み式）。
 */
type SentryLike = { captureException: (e: unknown, ctx?: unknown) => void };

function sentry(): SentryLike | null {
  if (!isSentryEnabled) return null;
  const g = globalThis as unknown as { Sentry?: SentryLike };
  return g.Sentry ?? null;
}

/**
 * Sentry が「実際に」使える状態か。
 * DSN が設定されていても SDK が読み込まれていなければ送信されない。
 * /api/health で「有効」と報告して監視できている気にならないよう、
 * DSN の有無ではなくこちらを使う。
 */
export function isSentryActive(): boolean {
  return sentry() !== null;
}

export const logger = {
  info(message: string, meta?: Meta) {
    console.log(JSON.stringify({ level: "info", message, ...meta }));
  },
  warn(message: string, meta?: Meta) {
    console.warn(JSON.stringify({ level: "warn", message, ...meta }));
  },
  error(message: string, error?: unknown, meta?: Meta) {
    console.error(JSON.stringify({ level: "error", message, ...meta }), error);
    sentry()?.captureException(error ?? new Error(message), meta ? { extra: meta } : undefined);
    // Sentry を入れていない間、エラーは console にしか残らず
    // Vercel のログを直接見ない限り気づけない。DB にも積んで管理画面から見る。
    // Sentry を導入したらこちらは止められる（isSentryActive で分岐）。
    if (!isSentryActive()) {
      const e = error instanceof Error ? error : undefined;
      void recordError({
        level: "ERROR",
        message: e?.message ? `${message}: ${e.message}` : message,
        stack: e?.stack,
        context: meta,
      });
    }
  },
};
