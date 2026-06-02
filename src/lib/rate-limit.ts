import "server-only";
import { headers } from "next/headers";
import { env, isRateLimitEnabled } from "./env";
import { logger } from "./logger";

export interface RateResult {
  ok: boolean;
  remaining: number;
}

/**
 * 固定ウィンドウのレート制限（Upstash Redis REST・env 差込み式）。
 * キーが無ければ常に許可（no-op）。サーバーレスでも共有可能。
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  if (!isRateLimitEnabled) return { ok: true, remaining: limit };

  const base = env.UPSTASH_REDIS_REST_URL!;
  const token = env.UPSTASH_REDIS_REST_TOKEN!;
  const auth = { Authorization: `Bearer ${token}` };
  const k = `rl:${key}`;

  try {
    const res = await fetch(`${base}/incr/${encodeURIComponent(k)}`, { headers: auth, cache: "no-store" });
    const data = (await res.json()) as { result: number };
    const count = data.result;
    if (count === 1) {
      await fetch(`${base}/expire/${encodeURIComponent(k)}/${windowSec}`, { headers: auth, cache: "no-store" });
    }
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    // レート制限基盤の障害時はサービス継続を優先（fail-open）。
    logger.error("rate-limit error", err, { key });
    return { ok: true, remaining: limit };
  }
}

/** リクエストの識別子（IP）を取得。 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
