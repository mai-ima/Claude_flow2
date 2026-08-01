"""設定画面のパスワード変更と端末一覧を実ブラウザで確認する。

流れ:
  1. 新規登録してログイン
  2. 別ブラウザからも同じアカウントでログイン（端末を2つにする）
  3. 設定画面に端末が2件出ること、片方に「この端末」が付くこと
  4. 現在のパスワードを間違えると変更されないこと
  5. 正しく変更でき、もう一方の端末のログインが切れること
"""

import re
import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = f"sec{int(time.time())}@example.test"
PW_OLD = "oldpassword1"
PW_NEW = "newpassword2"

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def submit_and_settle(page):
    """成功なら遷移、失敗ならエラー表示。どちらか決着するまで待つ。

    networkidle だけでは、Server Action の応答→再描画が終わる前に返ることがあり
    「まだ /login にいる」と誤判定する。決着そのものを待つ。
    """
    for _ in range(50):
        if "/dashboard" in page.url:
            return
        if page.locator('[role="alert"]').count() > 0:
            return
        page.wait_for_timeout(200)


def signup(page, email, password):
    page.goto(f"{BASE}/signup")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.get_by_role("button", name=re.compile("登録|はじめる|作成")).first.click()
    submit_and_settle(page)


def login(page, email, password):
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.get_by_role("button", name=re.compile("ログイン")).first.click()
    submit_and_settle(page)


with sync_playwright() as p:
    # この環境の Playwright は headless shell を持たないので、同梱の chromium を指す。
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get("E2E_CHROMIUM") or None)
    # 初回描画に時間がかかることがあるので既定の30秒より長く待つ。


    # 端末A（Windows の Chrome を名乗る）
    ctx_a = browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
    )
    a = ctx_a.new_page()
    a.set_default_timeout(60000)
    a.set_default_navigation_timeout(60000)
    signup(a, EMAIL, PW_OLD)
    check("新規登録でダッシュボードに入る", "/dashboard" in a.url, a.url)

    # 端末B（iPhone の Safari を名乗る）
    ctx_b = browser.new_context(
        user_agent=(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        )
    )
    b = ctx_b.new_page()
    b.set_default_navigation_timeout(60000)
    login(b, EMAIL, PW_OLD)
    check("2台目からもログインできる", "/dashboard" in b.url, b.url)

    # 端末Aの設定画面
    a.goto(f"{BASE}/settings")
    a.wait_for_load_state("networkidle")
    a.screenshot(path="/tmp/claude-0/-home-user-Claude-flow2/001e99d1-975a-5152-9852-4f1ea7cda060/scratchpad/settings-security.png", full_page=True)

    body = a.inner_text("body")
    check("端末一覧に Windows の Chrome が出る", "Windows の Chrome" in body)
    check("端末一覧に iPhone の Safari が出る", "iPhone の Safari" in body)
    check("自分の端末に「この端末」が付く", "この端末" in body)
    check("パスワード変更の見出しが出る", "パスワード" in body)

    # 現在のパスワードを間違える
    cur = a.locator('input[autocomplete="current-password"]')
    new = a.locator('input[autocomplete="new-password"]')
    cur.fill("wrongpassword")
    new.nth(0).fill(PW_NEW)
    new.nth(1).fill(PW_NEW)
    a.get_by_role("button", name="パスワードを変更").click()
    a.wait_for_selector('[role="alert"]', timeout=15000)
    msg = a.locator('[role="alert"]').first.inner_text()
    check("誤った現在のパスワードは拒否される", "正しくありません" in msg, msg)

    # 古いパスワードでまだログインできる = 変更されていない
    ctx_c = browser.new_context()
    c = ctx_c.new_page()
    login(c, EMAIL, PW_OLD)
    check("拒否されたときパスワードは変わっていない", "/dashboard" in c.url, c.url)
    ctx_c.close()

    # 正しく変更する
    a.goto(f"{BASE}/settings")
    a.wait_for_load_state("networkidle")
    cur = a.locator('input[autocomplete="current-password"]')
    new = a.locator('input[autocomplete="new-password"]')
    cur.fill(PW_OLD)
    new.nth(0).fill(PW_NEW)
    new.nth(1).fill(PW_NEW)
    a.get_by_role("button", name="パスワードを変更").click()
    a.wait_for_selector("text=変更しました", timeout=10000)
    check("パスワードを変更できる", True)

    # 端末Bのログインが切れている
    b.goto(f"{BASE}/settings")
    b.wait_for_load_state("networkidle")
    check("他の端末はログアウトされる", "/login" in b.url, b.url)

    # 端末Aは維持されている
    a.goto(f"{BASE}/settings")
    a.wait_for_load_state("networkidle")
    check("操作した端末はログインを維持する", "/settings" in a.url, a.url)

    # 新しいパスワードでログインできる
    ctx_d = browser.new_context()
    d = ctx_d.new_page()
    login(d, EMAIL, PW_NEW)
    check("新しいパスワードでログインできる", "/dashboard" in d.url, d.url)

    # 古いパスワードは通らない
    ctx_e = browser.new_context()
    e = ctx_e.new_page()
    login(e, EMAIL, PW_OLD)
    check("古いパスワードでは入れない", "/login" in e.url, e.url)
    err = e.locator('[role="alert"]').first.inner_text() if e.locator('[role="alert"]').count() else ""
    check(
        "失敗メッセージがアカウントの有無を示さない",
        "メールアドレスまたはパスワード" in err,
        err,
    )

    # 未登録メールでも同じ文言
    f = ctx_e.new_page()
    login(f, "nosuchuser-zzz@example.test", "whateverpass")
    err2 = f.locator('[role="alert"]').first.inner_text() if f.locator('[role="alert"]').count() else ""
    check("未登録メールでも同じ文言", err2 == err and err2 != "", f"{err2!r} vs {err!r}")

    browser.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
