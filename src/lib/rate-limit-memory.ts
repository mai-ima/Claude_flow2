/**
 * プロセス内のレート制限（固定ウィンドウ）。
 *
 * Upstash を設定していない環境では rateLimit が素通りする。
 * それでも構わない場面は多いが、ログインやパスワード再設定まで
 * 素通りにすると、総当たりを何も止められない。
 *
 * 限界を承知で使うこと:
 *   - サーバーレスでは実行環境ごとに別勘定になる。台数分だけ緩くなる。
 *   - 実行環境が作り直されると数え直しになる。
 * それでも「1台に何千回も投げる」形の総当たりは確実に遅くできる。
 * 正しく守りたいなら Upstash を設定する。ここは最後の砦であって代替ではない。
 */

interface Window {
  count: number;
  /** このウィンドウが切れる時刻（ミリ秒）。 */
  resetAt: number;
}

/** 溜め込みすぎないための上限。超えたら期限切れから捨てる。 */
const MAX_KEYS = 10_000;

const windows = new Map<string, Window>();

/** 期限切れを掃除する。呼ぶたびに全走査はせず、上限に達したときだけ。 */
function prune(now: number) {
  for (const [k, w] of windows) {
    if (w.resetAt <= now) windows.delete(k);
  }
  // それでも多いときは古い順に落とす（Map は挿入順を保つ）。
  if (windows.size > MAX_KEYS) {
    const excess = windows.size - MAX_KEYS;
    let i = 0;
    for (const k of windows.keys()) {
      windows.delete(k);
      if (++i >= excess) break;
    }
  }
}

export interface MemoryRateResult {
  ok: boolean;
  remaining: number;
}

export function memoryRateLimit(
  key: string,
  limit: number,
  windowSec: number,
  now: number = Date.now(),
): MemoryRateResult {
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_KEYS) prune(now);
    windows.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1 };
  }

  existing.count += 1;
  return { ok: existing.count <= limit, remaining: Math.max(0, limit - existing.count) };
}

/** テスト用。状態を空にする。 */
export function resetMemoryRateLimit() {
  windows.clear();
}

/** テスト用。保持しているキー数。 */
export function memoryRateLimitSize(): number {
  return windows.size;
}
