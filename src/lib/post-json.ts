/**
 * JSON を POST して JSON を受け取る。クライアント専用。
 *
 * 背景: 各所で `await res.json()` を res.ok を見ずに呼んでいたため、
 * 500 や 429 で HTML/プレーンテキストが返ると SyntaxError で例外になり、
 * finally でローディングだけ解除されて「押しても何も起きない」状態だった。
 * ここで必ず {ok, data, message} に正規化する。
 */
export interface PostJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** 失敗時に画面へ出せる日本語メッセージ。 */
  message?: string;
}

function fallbackMessage(status: number): string {
  if (status === 429) return "操作が集中しています。少し時間をおいてお試しください。";
  if (status === 401) return "ログインが必要です。";
  if (status === 403) return "この操作を行う権限がありません。";
  if (status === 503) return "現在ご利用いただけません。時間をおいてお試しください。";
  return "処理に失敗しました。時間をおいて再度お試しください。";
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
