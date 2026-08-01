"""サブスクの判断材料（PR18）を実画面で見る。

見ているもの:
  - 価格の変更ページが年額の影響順に並び、値上げ／値下げで絞り込めること
  - サブスクを開いたときに、解約したら年いくら浮くか等が出ること
  - 見直し時期のサブスクに印が付くこと
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


def login(page):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_label("メールアドレス").fill(EMAIL)
    page.get_by_label("パスワード", exact=True).fill(PASSWORD)
    page.get_by_role("button", name=re.compile("ログイン")).click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        login(page)

        # ── 価格の変更ページ ──────────────────────────────
        page.goto(f"{BASE}/subscriptions/price-changes", wait_until="domcontentloaded")
        page.get_by_role("heading", name="価格の変更").first.wait_for(timeout=8000)
        body = page.locator("body").inner_text()

        check("年間影響の合計が出る", "値上げの年間影響" in body and "差引" in body)
        check("根拠が説明されている", "1年あたりいくら変わったか" in body)

        cards = page.locator("main .space-y-2\\.5 > *")
        n = cards.count()
        check("改定が一覧に出る", n >= 2, f"{n}件")

        # 並び順: 年額の影響が大きい順。仕込んだのは
        # Netflix 月+500 (年+6,000) / Spotify 月-300 (年-3,600) / Prime 年+500。
        texts = [cards.nth(i).inner_text() for i in range(n)]
        check("年額の影響が大きい順に並ぶ", "Netflix" in texts[0], texts[0].split("\n")[0])

        # 絞り込み
        page.get_by_role("radio", name="値下げ").click()
        page.wait_for_timeout(200)
        down = page.locator("main .space-y-2\\.5 > *")
        down_texts = [down.nth(i).inner_text() for i in range(down.count())]
        check(
            "値下げだけに絞れる",
            down.count() >= 1 and all("値下げ" in t for t in down_texts),
            f"{down.count()}件",
        )

        page.get_by_role("radio", name="値上げ").click()
        page.wait_for_timeout(200)
        up = page.locator("main .space-y-2\\.5 > *")
        up_texts = [up.nth(i).inner_text() for i in range(up.count())]
        check(
            "値上げだけに絞れる",
            up.count() >= 1 and all("値上げ" in t for t in up_texts),
            f"{up.count()}件",
        )
        page.screenshot(path=f"{SHOT_DIR}/price-changes.png")

        # ── サブスク一覧の見直し印と導線 ─────────────────
        page.goto(f"{BASE}/subscriptions", wait_until="domcontentloaded")
        page.get_by_role("heading", name="サブスク").first.wait_for(timeout=8000)
        list_body = page.locator("body").inner_text()
        check("見直しどきの印が出る", "見直しどき" in list_body)
        check("価格の変更への導線がある", "価格の変更" in list_body)

        # ── 判断材料のパネル ────────────────────────────
        page.get_by_text("Netflix", exact=True).first.click()
        panel = page.get_by_text("判断のための数字")
        panel.wait_for(state="visible", timeout=5000)
        # ConfirmProvider のシートが常設されているため [role=dialog] は2つある。
        # 名前で取らないと strict mode に引っかかる。
        sheet = page.get_by_role("dialog", name="サブスクを編集").inner_text()

        check("解約したときの年額が出る", "解約すると年間で" in sheet)
        check("月あたりも出る", "月あたりに直すと" in sheet)
        check("利用期間が出る", re.search(r"使っている期間\n?\s*\d+年", sheet) is not None,
              re.search(r"使っている期間.{0,12}", sheet, re.S).group(0).replace("\n", " "))
        check("累計の支払いが出る", "これまでの支払い（およそ）" in sheet)
        check("最後の見直しが出る", "最後に見直したのは" in sheet)
        check("見積りである旨を断っている", "見積り" in sheet)
        page.screenshot(path=f"{SHOT_DIR}/decision-panel.png")

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
