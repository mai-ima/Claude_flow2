"""設定の分割と、アイコン・色の選び方（PR22）を実画面で見る。

見ているもの:
  - 設定が目次になり、4つの下位ページへ入れること
  - どの下位ページからも設定へ戻れること
  - 通知やメールからの /settings が今も開けること（リンクを壊していない）
  - アイコンと色を、実物を見ながら選べること
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = os.environ.get("E2E_EMAIL", "demo@tsumiki.app")
PASSWORD = os.environ.get("E2E_PASSWORD", "demo1234")
SHOT_DIR = os.environ.get("E2E_SHOTS", "/tmp")

PAGES = [
    ("/settings/ledger", "帳簿の中身", ["カテゴリ", "タグ", "支払い方法"]),
    ("/settings/sharing", "ファミリー共有", ["メンバー"]),
    ("/settings/security", "ログインと安全性", ["パスワード", "二要素認証", "ログイン中の端末"]),
    ("/settings/advanced", "データとその他", ["データ（CSV）", "ベータ機能", "取り消せない操作"]),
]

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 390, "height": 844})

        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.get_by_label("メールアドレス").fill(EMAIL)
        page.get_by_label("パスワード", exact=True).fill(PASSWORD)
        page.get_by_role("button", name=re.compile("ログイン")).click()
        page.wait_for_url(lambda url: "/login" not in url, timeout=15000)

        # ── 目次 ────────────────────────────────────────
        page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
        page.get_by_role("heading", name="設定").first.wait_for(timeout=8000)
        top = page.locator("body").inner_text()
        check("/settings が開ける（リンクを壊していない）", "設定" in top)
        check("よく使う設定は残す", "プロフィール" in top and "外観" in top and "プラン" in top)
        check("目次が出る", "くわしい設定" in top)
        for _, title, _ in PAGES:
            check(f"目次に「{title}」がある", title in top)
        page.screenshot(path=f"{SHOT_DIR}/settings-top.png")

        # ── 下位ページ ──────────────────────────────────
        for href, title, sections in PAGES:
            page.goto(f"{BASE}{href}", wait_until="domcontentloaded")
            page.get_by_role("heading", name=title).first.wait_for(timeout=8000)
            body = page.locator("body").inner_text()
            missing = [s for s in sections if s not in body]
            check(f"{title}: 中身が揃っている", not missing, ",".join(missing))
            check(f"{title}: 戻る導線がある", "設定へ戻る" in body)

        # 戻る導線が実際に効く
        page.goto(f"{BASE}/settings/security", wait_until="domcontentloaded")
        page.get_by_role("link", name="設定へ戻る").click()
        page.wait_for_url(re.compile(r"/settings$"), timeout=8000)
        check("戻る導線が効く", page.url.endswith("/settings"))

        # ── アイコン・色のピッカー ──────────────────────
        page.goto(f"{BASE}/settings/ledger", wait_until="domcontentloaded")
        page.get_by_role("button", name=re.compile("カテゴリを追加")).click()
        page.get_by_label("カテゴリ名").wait_for(state="visible", timeout=5000)

        colors = page.get_by_role("radiogroup", name="色").get_by_role("radio")
        icons = page.get_by_role("radiogroup", name="アイコン").get_by_role("radio")
        check("色を見て選べる", colors.count() >= 8, f"{colors.count()}色")
        check("アイコンを見て選べる", icons.count() >= 12, f"{icons.count()}種")

        # 押すと選択状態が変わる
        page.get_by_role("radio", name="オレンジ").click()
        check("色を選ぶと印が付く",
              page.get_by_role("radio", name="オレンジ").get_attribute("aria-checked") == "true")
        page.get_by_role("radio", name="食事").click()
        check("アイコンを選ぶと印が付く",
              page.get_by_role("radio", name="食事").get_attribute("aria-checked") == "true")
        page.screenshot(path=f"{SHOT_DIR}/icon-color-picker.png")

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
