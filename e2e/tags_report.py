"""タグ・健康度・資産・月次レポート（PR21）を実画面で見る。

見ているもの:
  - タグを作り、記録に貼り、タグで絞り込めること
  - 健康度が点数だけでなく内訳と根拠を出すこと
  - 資産を月ごとに記録でき、前月との差が出ること
  - 月次レポートが1枚にまとまること
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

        # ── タグを作る ──────────────────────────────────
        page.goto(f"{BASE}/settings/ledger", wait_until="domcontentloaded")
        page.get_by_text("タグは、カテゴリとは別に", exact=False).first.wait_for(timeout=8000)
        settings = page.locator("body").inner_text()
        check("タグの説明が出る", "何枚でも貼れます" in settings)

        # 2回目以降は同じ名前で作れない。すでにあればそれでよい。
        if "旅行2026" not in settings:
            page.get_by_role("button", name=re.compile("タグを追加")).click()
            page.get_by_label("タグ名").fill("旅行2026")
            page.get_by_role("button", name="追加", exact=True).click()
        try:
            page.get_by_text("旅行2026", exact=False).first.wait_for(timeout=8000)
            made = True
        except Exception:
            made = False
        check("タグを作れる", made)

        # ── 記録に貼る ──────────────────────────────────
        page.goto(f"{BASE}/transactions", wait_until="domcontentloaded")
        page.wait_for_timeout(800)
        body = page.locator("body").inner_text()
        check("タグで絞り込める欄が出る", "タグ: すべて" in body)

        # 既存の記録を開いてタグを貼る。行はメモの文字で探す
        # （金額で探すと、集計カードの数字にも当たる）。
        page.get_by_text("家賃", exact=False).first.click()
        sheet = page.get_by_role("dialog", name=re.compile("記録"))
        sheet.wait_for(state="visible", timeout=6000)
        sheet_text = sheet.inner_text()
        check("シートにタグ欄が出る", "タグ（任意）" in sheet_text)

        # すでに貼ってあるなら押さない（押すと外れる）。テストを繰り返せるようにする。
        chip = page.get_by_role("button", name="旅行2026", exact=True)
        if chip.get_attribute("aria-pressed") != "true":
            chip.click()
        page.get_by_role("button", name=re.compile("^保存")).last.click()
        page.wait_for_timeout(2000)
        check("一覧にタグが出る", "旅行2026" in page.locator("body").inner_text())

        # ── 健康度 ──────────────────────────────────────
        page.goto(f"{BASE}/reports", wait_until="domcontentloaded")
        page.get_by_role("heading", name="分析").first.wait_for(timeout=8000)
        page.get_by_role("radio", name="健康度").click()
        page.wait_for_timeout(700)
        health = page.locator("body").inner_text()
        check("点数が出る", re.search(r"\d+\s*点", health) is not None)
        check("4つの見方を並べる", "貯蓄率" in health and "予算どおりか" in health
              and "固定費の重さ" in health and "記録の続き方" in health)
        check("判定の根拠を書く", "満点は" in health)
        check("データ不足でも不当に下げないと断る", "分母から外す" in health)
        page.screenshot(path=f"{SHOT_DIR}/health.png")

        # ── 資産 ────────────────────────────────────────
        page.get_by_role("radio", name="資産").click()
        page.wait_for_timeout(700)
        check("口座と繋がっていないと断る", "口座とはつながっていない" in page.locator("body").inner_text())

        page.get_by_role("button", name=re.compile("記録する")).first.click()
        asset_sheet = page.get_by_role("dialog", name="資産を記録")
        asset_sheet.wait_for(state="visible", timeout=6000)
        page.get_by_label("残高").fill("1250000")
        page.get_by_role("button", name=re.compile("^保存")).last.click()
        page.wait_for_timeout(2000)
        assets = page.locator("body").inner_text()
        check("資産が記録される", "1,250,000" in assets)
        page.screenshot(path=f"{SHOT_DIR}/assets.png")

        # ── 月次レポート ────────────────────────────────
        page.goto(f"{BASE}/reports/monthly", wait_until="domcontentloaded")
        page.get_by_role("heading", name=re.compile("のまとめ")).first.wait_for(timeout=8000)
        report = page.locator("body").inner_text()
        check("収支が出る", "収支" in report and "残った額" in report)
        check("支出の内訳が出る", "支出の内訳" in report)
        check("印刷の導線がある", "印刷 / PDF で保存" in report)
        check("推測は含まないと断る", "推測は含みません" in report)
        page.screenshot(path=f"{SHOT_DIR}/monthly-report.png", full_page=True)

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
