/**
 * JSON を POST して JSON を受け取る。クライアント専用。
 *
 * 背景: 各所で `await res.json()` を res.ok を見ずに呼んでいたため、
 * 500 や 429 で HTML/プレーンテキストが返ると SyntaxError で例外になり、
 * finally でローディングだけ解除されて「押しても何も起きない」状態だった。
 * ここで必ず {ok, data, message} に正規化する。
 */
import { API_MESSAGE } from "./api-messages";

export interface PostJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** 失敗時に画面へ出せる日本語メッセージ。 */
  message?: string;
}

// サーバーが message を返さなかったときの言い方。
// 文言は API_MESSAGE と揃える。同じ状況で画面ごとに言い方が変わると、
// 利用者からは別の出来事に見える。
function fallbackMessage(status: number): string {
  if (status === 429) return API_MESSAGE.RATE_LIMITED;
  if (status === 401) return API_MESSAGE.UNAUTHORIZED;
  if (status === 403) return API_MESSAGE.FORBIDDEN;
  if (status === 404) return API_MESSAGE.NOT_FOUND;
  if (status === 503) return API_MESSAGE.UNAVAILABLE;
  return API_MESSAGE.FAILED;
}

export async function postJson<T = unknown>(
  url: string,
  body?: unknown,
): Promise<PostJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    return { ok: false, status: 0, data: null, message: "通信に失敗しました。接続を確認してください。" };
  }

  // JSON 以外（HTML のエラーページ等）が返ることがあるため必ず保護する。
  let data: T | null = null;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const m = (data as { message?: string } | null)?.message;
    return { ok: false, status: res.status, data, message: m || fallbackMessage(res.status) };
  }
  return { ok: true, status: res.status, data };
}
