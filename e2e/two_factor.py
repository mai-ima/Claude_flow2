"""二要素認証を実ブラウザで通しで確かめる。

コードの生成は実装と同じ RFC 6238 の手順を Python 側で独立に書く。
アプリの実装をそのまま呼ぶと「自分で作った鍵で自分が検証する」ことになり、
本当に標準どおりかを確かめられないため。
"""

import base64
import hashlib
import hmac
import re
import struct
import subprocess
import os
import sys
import time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = f"tfa{int(time.time())}@example.test"
PW = "password1234"

# 覗きに行くデータベースの場所。DATABASE_URL があればそこから読み、
# 無ければ E2E_DB_HOST / E2E_DB_PORT / E2E_DB で上書きできる。
# 以前は 127.0.0.1:5433 を直接書いていたため、別のポートでサーバーを
# 動かすと psql が空を返すだけで、検査は素通りしていた。
_DB = urlparse(os.environ.get("DATABASE_URL") or "")
DB_HOST = os.environ.get("E2E_DB_HOST") or _DB.hostname or "127.0.0.1"
DB_PORT = str(os.environ.get("E2E_DB_PORT") or _DB.port or 5432)
DB_NAME = os.environ.get("E2E_DB") or _DB.path.lstrip("/") or "tsumiki_e2e"

results = []
LIVE = '[role="alert"]:not(#__next-route-announcer__), [role="status"]'


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def psql(sql):
    out = subprocess.run(
        ["psql", "-h", DB_HOST, "-p", DB_PORT, "-U", "postgres", "-tAc", sql, DB_NAME],
        capture_output=True, text=True,
    )
    # つながらないまま先へ進むと、検査が無条件に通ってしまう。
    if out.returncode != 0:
        sys.exit(f"psql に失敗しました（{DB_HOST}:{DB_PORT}/{DB_NAME}）: {out.stderr.strip()}")
    return out.stdout.strip()


def totp(secret_b32, at=None):
    """RFC 6238 を独立に実装（アプリ側のコードは使わない）。"""
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8))
    counter = int((at or time.time()) // 30)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % 10**6).zfill(6)


def form_alert(page):
    loc = page.locator('form [role="alert"]')
    return loc.first.inner_text() if loc.count() else None


def settle(page, from_path):
    """遷移するか、フォームのエラー表示が「変わる」まで待つ。

    useActionState は次の結果が返るまで前の状態を保つので、直前の失敗で
    出たエラーがそのまま残っている。単に存在を見ると、送信した瞬間に
    「もう結果が出た」と誤判定する。
    """
    before = form_alert(page)
    for _ in range(75):
        if from_path not in page.url:
            return
        now = form_alert(page)
        if now is not None and now != before:
            return
        page.wait_for_timeout(200)


def signup(page):
    page.goto(f"{BASE}/signup", wait_until="domcontentloaded")
    page.fill('input[name="email"]', EMAIL)
    page.fill('input[name="password"]', PW)
    page.get_by_role("button", name="アカウントを作成").click()
    settle(page, "/signup")


def login(page):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.fill('input[name="email"]', EMAIL)
    page.fill('input[name="password"]', PW)
    page.get_by_role("button", name="ログイン").click()
    settle(page, "/login")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get("E2E_CHROMIUM") or None)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.set_default_navigation_timeout(60000)

    signup(page)
    check("新規登録できる", "/signup" not in page.url, page.url)

    # 設定画面から二要素を開始
    page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
    page.wait_for_selector("text=二要素認証", timeout=30000)
    page.get_by_role("button", name="二要素認証を設定する").click()
    page.wait_for_selector("text=セットアップキー", timeout=30000)

    body = page.inner_text("body")
    m = re.search(r"セットアップキー\s*\n?\s*([A-Z2-7]{32})", body)
    check("Base32 の鍵が表示される", bool(m), (m.group(1)[:8] + "…") if m else body[:120])
    secret = m.group(1)

    # otpauth の URI が正しい形か
    page.get_by_text("アプリのリンクを使う").click()
    page.wait_for_timeout(300)
    check("otpauth の URI が出る", "otpauth://totp/" in page.inner_text("body"))

    # 間違ったコードは通らない
    code_input = page.get_by_label("アプリに表示された6桁のコード")
    code_input.fill("000000")
    page.get_by_role("button", name="有効にする").click()
    page.wait_for_selector(LIVE, timeout=30000)
    check("誤ったコードは拒否される", "正しくありません" in page.locator(LIVE).first.inner_text())
    enabled = psql(f"SELECT \"twoFactorEnabledAt\" IS NOT NULL FROM \"User\" WHERE email='{EMAIL}'")
    check("拒否されたときは有効化されない", enabled == "f", enabled)

    # 正しいコードで有効化 → 復旧コードが出る
    page.get_by_label("アプリに表示された6桁のコード").fill(totp(secret))
    page.get_by_role("button", name="有効にする").click()
    page.wait_for_selector("text=復旧コード", timeout=30000)
    body = page.inner_text("body")
    recovery = re.findall(r"\b([A-Z2-7]{4}-[A-Z2-7]{4})\b", body)
    check("復旧コードが10個表示される", len(recovery) == 10, str(len(recovery)))

    # 保存されているのはハッシュであること
    stored = psql(f"SELECT \"twoFactorRecoveryCodes\"::text FROM \"User\" WHERE email='{EMAIL}'")
    check("復旧コードは平文で保存されない", recovery[0].replace("-", "") not in stored.upper(),
          stored[:40])
    check("復旧コードはハッシュで保存される", bool(re.search(r"[0-9a-f]{64}", stored)))

    # ログインし直すと2段目を求められる
    ctx2 = browser.new_context()
    p2 = ctx2.new_page()
    p2.set_default_navigation_timeout(60000)
    login(p2)
    check("パスワードだけでは入れない", "/login/verify" in p2.url, p2.url)

    # この時点でセッションが作られていないこと
    sessions = psql(
        f"SELECT count(*) FROM \"Session\" s JOIN \"User\" u ON u.id=s.\"userId\" "
        f"WHERE u.email='{EMAIL}'"
    )
    check("2段目の前にセッションは作られない", sessions == "1", f"{sessions}件（設定画面の1件のみ）")

    # 誤ったコード
    p2.fill('input[name="code"]', "000000")
    p2.get_by_role("button", name="確認する").click()
    p2.wait_for_selector(LIVE, timeout=30000)
    check("2段目で誤コードは拒否", "正しくありません" in p2.locator(LIVE).first.inner_text())
    check("拒否されても最初からやり直しにならない", "/login/verify" in p2.url, p2.url)

    # 正しいコード
    p2.fill('input[name="code"]', totp(secret))
    p2.get_by_role("button", name="確認する").click()
    settle(p2, "/login/verify")
    check("正しいコードでログインできる", "/login" not in p2.url, p2.url)

    # 復旧コードでもログインできる
    ctx3 = browser.new_context()
    p3 = ctx3.new_page()
    p3.set_default_navigation_timeout(60000)
    login(p3)
    p3.fill('input[name="code"]', recovery[0])
    p3.get_by_role("button", name="確認する").click()
    settle(p3, "/login/verify")
    check("復旧コードでログインできる", "/login" not in p3.url, p3.url)

    # 使った復旧コードは二度と使えない
    ctx4 = browser.new_context()
    p4 = ctx4.new_page()
    p4.set_default_navigation_timeout(60000)
    login(p4)
    p4.fill('input[name="code"]', recovery[0])
    p4.get_by_role("button", name="確認する").click()
    p4.wait_for_selector(LIVE, timeout=30000)
    check("使った復旧コードは再利用できない", "正しくありません" in p4.locator(LIVE).first.inner_text())

    # 待ち状態が無いのに /login/verify を直接開いてもログインできない
    ctx5 = browser.new_context()
    p5 = ctx5.new_page()
    p5.set_default_navigation_timeout(60000)
    p5.goto(f"{BASE}/login/verify", wait_until="domcontentloaded")
    check("待ち状態なしでは確認画面に入れない", "/login" in p5.url and "verify" not in p5.url, p5.url)

    # 解除にはパスワードが要る
    page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
    page.wait_for_selector("text=二要素認証", timeout=30000)
    check("設定画面で有効と表示される", "有効" in page.inner_text("body"))
    pw_field = page.locator('input[autocomplete="current-password"]').last
    pw_field.fill("wrongpassword")
    page.get_by_role("button", name="解除する").click()
    page.wait_for_selector("text=解除しますか", timeout=30000)
    page.get_by_role("button", name="解除する").last.click()
    page.wait_for_selector(LIVE, timeout=30000)
    still = psql(f"SELECT \"twoFactorEnabledAt\" IS NOT NULL FROM \"User\" WHERE email='{EMAIL}'")
    check("誤ったパスワードでは解除されない", still == "t", still)

    browser.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
