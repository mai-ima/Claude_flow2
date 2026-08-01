"""保存した検索・絞り込みの保持・使い始めの案内（PR20）を実画面で見る。

見ているもの:
  - 絞り込んだ条件に名前を付けて保存し、1タップで呼び戻せること
  - 他の画面へ行って戻ってきても絞り込みが残っていること
  - 使い始めの案内が、実データにもとづいて済み・未済を出すこと
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = os.environ.get("E2E_EMAIL", "demo@tsumiki.app")
PASSWORD = os.environ.get("E2E_PASSWORD", "demo1234")
SHOT_DIR = os.environ.get("E2E_SHOTS", "/tmp")

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

        # ── 使い始めの案内 ──────────────────────────────
        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(600)
        home = page.locator("body").inner_text()
        has_card = "はじめの3つ" in home
        check("使い始めの案内が出る", has_card)
        if has_card:
            check(
                "進み具合を数で出す",
                re.search(r"3つのうち\s*\d+つ\s*済んでいます", home) is not None
                or "ひととおり終わりました" in home,
                re.search(r"3つのうち.{0,20}", home).group(0) if "3つのうち" in home else home[:40],
            )
            check("記録の案内がある", "はじめの記録をつける" in home)
            check("カテゴリの案内がある", "カテゴリを自分に合わせる" in home)
            check("予算の案内がある", "予算を決める" in home)
            page.screenshot(path=f"{SHOT_DIR}/onboarding.png")

        # ── 絞り込みと保存 ──────────────────────────────
        page.goto(f"{BASE}/transactions?type=EXPENSE", wait_until="domcontentloaded")
        page.get_by_role("heading", name="家計簿").first.wait_for(timeout=8000)
        page.wait_for_timeout(500)

        body = page.locator("body").inner_text()
        check("絞り込み中は保存ボタンが出る", "この条件を保存" in body)
        check("解除ボタンも出る", "絞り込みを解除" in body)

        page.get_by_role("button", name="この条件を保存").click()
        name_field = page.get_by_label("保存する絞り込みの名前")
        name_field.wait_for(state="visible", timeout=4000)
        name_field.fill("支出だけ")
        page.get_by_role("button", name="保存", exact=True).click()
        # 保存はサーバー往復のうえ router.refresh() で描き直される。
        # 固定待ちでは足りないので、現れるのを待つ。
        import time

        t0 = time.time()
        try:
            page.get_by_role("button", name="支出だけ", exact=True).wait_for(timeout=10000)
            appeared = True
        except Exception:
            appeared = False
        check("保存した名前が並ぶ", appeared, f"{time.time() - t0:.1f}秒")

        # ── 絞り込みの保持 ──────────────────────────────
        # 一度絞り込みを外し、別の画面へ行って戻る。
        page.goto(f"{BASE}/reports", wait_until="domcontentloaded")
        page.wait_for_timeout(400)
        page.goto(f"{BASE}/transactions", wait_until="domcontentloaded")
        page.wait_for_timeout(1200)
        check(
            "戻ってきても絞り込みが残る",
            "type=EXPENSE" in page.url,
            page.url.split("?")[-1],
        )

        # ── 保存した検索の呼び出し ──────────────────────
        page.goto(f"{BASE}/transactions?type=INCOME", wait_until="domcontentloaded")
        page.wait_for_timeout(600)
        page.get_by_role("button", name="支出だけ", exact=True).click()
        page.wait_for_timeout(1200)
        check("保存した条件を呼び戻せる", "type=EXPENSE" in page.url, page.url.split("?")[-1])

        page.screenshot(path=f"{SHOT_DIR}/saved-search.png")

        # ── 保存の削除 ──────────────────────────────────
        page.get_by_role("button", name="「支出だけ」の保存を消す").click()
        # router.refresh() の往復があるため、消えるのを待つ。固定待ちでは足りない。
        try:
            page.get_by_role("button", name="支出だけ", exact=True).wait_for(
                state="detached", timeout=8000
            )
            gone = True
        except Exception:
            gone = False
        check("保存を消せる", gone)

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
