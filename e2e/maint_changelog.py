"""メンテナンス中の締め出しと、リリースノートの通常版／詳細版を確かめる。"""

import subprocess
import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = f"maint{int(time.time())}@example.test"
PW = "password1234"

DB_NAME = os.environ.get("E2E_DB", "tsumiki_e2e")

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def psql(sql, db=None):
    out = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-p", "5433", "-U", "postgres", "-tAc", sql, db or DB_NAME],
        capture_output=True, text=True,
    )
    return out.stdout.strip()


def settle(page, from_path):
    for _ in range(75):
        if from_path not in page.url:
            return
        if page.locator('form [role="alert"]').count() > 0:
            return
        page.wait_for_timeout(200)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get("E2E_CHROMIUM") or None)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.set_default_navigation_timeout(60000)

    # 一般ユーザーで登録
    page.goto(f"{BASE}/signup", wait_until="domcontentloaded")
    page.fill('input[name="email"]', EMAIL)
    page.fill('input[name="password"]', PW)
    page.get_by_role("button", name="アカウントを作成").click()
    settle(page, "/signup")
    check("新規登録できる", "/signup" not in page.url, page.url)

    # メンテナンスを有効にする（管理画面の操作と同じ結果を作る）
    psql(
        "INSERT INTO \"SystemSetting\" (key, value, \"updatedAt\") "
        "VALUES ('maintenanceMode', 'true'::jsonb, now()) "
        "ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb"
    )

    page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
    page.wait_for_selector("text=メンテナンス中です", timeout=30000)
    check("一般ユーザーにはメンテナンス画面が出る", True)

    body = page.inner_text("body")
    check("ログアウトの出口がある", "ログアウトして別のアカウントでログイン" in body)
    check("管理者向けの案内がある", "管理者アカウントでログイン" in body)

    # 管理画面へ行こうとしても戻されること（行き止まりの再現）
    page.goto(f"{BASE}/admin", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    check("管理画面には入れない", "メンテナンス中です" in page.inner_text("body"), page.url)

    # 出口が本当に機能すること
    page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
    page.wait_for_selector("text=メンテナンス中です", timeout=30000)
    page.get_by_role("button", name="ログアウトして別のアカウントでログイン").click()
    for _ in range(75):
        if "/dashboard" not in page.url:
            break
        page.wait_for_timeout(200)
    check("ログアウトできる", "/dashboard" not in page.url, page.url)

    sessions = psql(
        f"SELECT count(*) FROM \"Session\" s JOIN \"User\" u ON u.id=s.\"userId\" "
        f"WHERE u.email='{EMAIL}'"
    )
    check("セッションが破棄される", sessions == "0", f"{sessions}件")

    # ログイン画面が開けること（別アカウントで入り直せる）
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    check("メンテナンス中でもログイン画面は開く", page.locator('input[name="email"]').count() > 0)

    # メンテナンスを解除
    psql("UPDATE \"SystemSetting\" SET value='false'::jsonb WHERE key='maintenanceMode'")

    # ── リリースノートの切り替え ──
    page.goto(f"{BASE}/changelog", wait_until="domcontentloaded")
    page.wait_for_selector("text=リリースノート", timeout=30000)

    check("通常版・詳細版の切り替えがある", page.get_by_role("button", name="詳細版").count() > 0)

    normal = page.inner_text("body")
    check("既定は通常版", "二要素認証に対応しました。" in normal, normal[:60])
    check("通常版に詳細版の文言は出ない", "Google Authenticator" not in normal)

    page.get_by_role("button", name="詳細版").first.click()
    page.wait_for_timeout(500)
    detailed = page.inner_text("body")
    check("詳細版に切り替わる", "Google Authenticator" in detailed)

    page.get_by_role("button", name="通常版").first.click()
    page.wait_for_timeout(500)
    check("通常版に戻せる", "Google Authenticator" not in page.inner_text("body"))

    # 古い版には切り替えを出さない
    count_toggles = page.get_by_role("button", name="詳細版").count()
    check("切り替えは通常版を持つ版だけ", count_toggles == 1, f"{count_toggles}個")

    page.screenshot(
        path="/tmp/claude-0/-home-user-Claude-flow2/001e99d1-975a-5152-9852-4f1ea7cda060/scratchpad/changelog.png",
        full_page=False,
    )
    browser.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
