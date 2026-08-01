/*
 * オフラインのときに、真っ白ではなく理由が出るようにするだけの
 * サービスワーカー。
 *
 * 家計簿で怖いのは「古い金額が出ること」。残高や収支は、少しでも
 * 古ければ嘘になる。だから次の線を引く。
 *
 *   キャッシュしてよい   … 画面の骨組み（CSS・JS・フォント・アイコン）
 *   キャッシュしない     … 中身のあるページ、/api、認証まわり
 *
 * 通信できるときは必ずネットワークを見る（cache first にしない）。
 * 通信できないときだけ、静的なオフライン画面を返す。
 * 金額を出さない画面なので、古い数字を見せてしまうことがない。
 */

// 中身を変えたらここも上げる。古いキャッシュは activate で消える。
const CACHE = "tsumiki-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([OFFLINE_URL, "/icon.svg"]))
      // オフライン画面すら取れない状況でも、インストール自体は通す。
      // ここで失敗させると、以後この worker が一切動かない。
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** 保存してよい相手か。中身（金額）が乗るものは全て false。 */
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  // Next のビルド成果物。ファイル名にハッシュが入るので、古いものが
  // 使われることがない。
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icon") || url.pathname === "/manifest.webmanifest") return true;
  return /\.(css|js|woff2?|png|svg|webp|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // データが乗るものは絶対に触らない。ここを通すと、圏外で開いたときに
  // 先月の残高が今月のものとして出かねない。
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return;

  if (isCacheableAsset(url)) {
    event.respondWith(
      // まずネットワーク。取れたら保存して次に備える。
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // ページ本体。取れなければオフライン画面を返す。
  // 中身をキャッシュに残すことはしない。
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? new Response("", { status: 504 })),
      ),
    );
  }
});
