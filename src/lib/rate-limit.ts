import "server-only";
import { headers } from "next/headers";
import { env, isRateLimitEnabled } from "./env";
import { logger } from "./logger";
import { memoryRateLimit } from "./rate-limit-memory";

export interface RateResult {
  ok: boolean;
  remaining: number;
}

/**
 * 固定ウィンドウのレート制限（Upstash Redis REST・env 差込み式）。
 * キーが無ければ常に許可（no-op）。サーバーレスでも共有可能。
 *
 * INCR の後の EXPIRE が失敗すると TTL の無いキーが残り、
 * 上限に達したまま永久にブロックされる。失敗時はキーを削除して
 * 次回やり直せるようにする。
 */
export interface RateOptions {
  /**
   * Upstash が無いときにプロセス内で数えるか。
   *
   * 既定は false（従来通り素通り）。ログインやパスワード再設定など、
   * 素通りにすると総当たりを何も止められない経路でだけ true にする。
   * 全ての経路で有効にしないのは、件数の多い API でメモリを持ちたくないため。
   */
  memoryFallback?: boolean;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
  options: RateOptions = {},
): Promise<RateResult> {
  if (!isRateLimitEnabled) {
    if (options.memoryFallback) return memoryRateLimit(key, limit, windowSec);
    return { ok: true, remaining: limit };
  }

  const base = env.UPSTASH_REDIS_REST_URL!;
  const token = env.UPSTASH_REDIS_REST_TOKEN!;
  const auth = { Authorization: `Bearer ${token}` };
  const k = `rl:${key}`;

  try {
    const res = await fetch(`${base}/incr/${encodeURIComponent(k)}`, { headers: auth, cache: "no-store" });
    const data = (await res.json()) as { result: number };
    const count = data.result;
    if (count === 1) {
      const exp = await fetch(`${base}/expire/${encodeURIComponent(k)}/${windowSec}`, {
        headers: auth,
        cache: "no-store",
      });
      if (!exp.ok) {
        await fetch(`${base}/del/${encodeURIComponent(k)}`, { headers: auth, cache: "no-store" }).catch(
          () => {},
        );
        return { ok: true, remaining: limit };
      }
    }
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    // レート制限基盤の障害時はサービス継続を優先（fail-open）。
    // ただし認証系だけは、素通りにすると障害中が総当たりの好機になる。
    logger.error("rate-limit error", err, { key });
    if (options.memoryFallback) return memoryRateLimit(key, limit, windowSec);
    return { ok: true, remaining: limit };
  }
}

/** リクエストの識別子（IP）を取得。 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
