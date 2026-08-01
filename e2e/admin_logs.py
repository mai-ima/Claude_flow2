"""管理コンソールのログ操作（PR27）を実画面で見る。

見ているもの:
  - 運用の記録を絞り込めること
  - 選んで消せること、まとめて消せること
  - 監査ログだけは1件ずつ消せないこと
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
ADMIN_EMAIL = os.environ.get("E2E_ADMIN_EMAIL", "admin@tsumiki.app")
ADMIN_PASSWORD = os.environ.get("E2E_ADMIN_PASSWORD", "AdminTest12345!")
SHOT_DIR = os.environ.get("E2E_SHOTS", "/tmp")

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def login(page):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_label("メールアドレス").fill(ADMIN_EMAIL)
    page.get_by_label("パスワード", exact=True).fill(ADMIN_PASSWORD)
    page.get_by_role("button", name=re.compile("ログイン")).click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        login(page)

        # ── 運用 ────────────────────────────────────────
        page.goto(f"{BASE}/admin/ops", wait_until="domcontentloaded")
        page.get_by_role("heading", name="運用").first.wait_for(timeout=8000)
        body = page.locator("body").inner_text()

        check("自動処理の履歴がある", "自動処理の履歴" in body)
        check("全体の件数が出る", re.search(r"\d+件", body) is not None)
        check("絞り込みがある", "すべてのジョブ" in body and "すべての結果" in body)
        check("まとめて削除の入口がある", "まとめて削除" in body)
        page.screenshot(path=f"{SHOT_DIR}/pr27-admin-ops.png", full_page=True)

        # 手動実行して履歴を1件作る（消す対象を用意する）。
        run = page.get_by_role("button", name=re.compile("いま実行|手動で実行|実行する"))
        if run.count() > 0:
            run.first.click()
            page.wait_for_timeout(4000)

        # ── 選んで消す ──────────────────────────────────
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        boxes = page.get_by_role("checkbox", name=re.compile("を選択$"))
        if boxes.count() > 0:
            boxes.first.check()
            page.wait_for_timeout(300)
            check(
                "選ぶと削除ボタンが出る",
                page.get_by_role("button", name=re.compile("選択した.*件を削除")).count() > 0,
            )
            page.get_by_role("button", name=re.compile("選択した.*件を削除")).first.click()
            dialog = page.get_by_role("dialog", name=re.compile("削除しますか"))
            dialog.wait_for(state="visible", timeout=5000)
            dialog.get_by_role("button", name="削除する").click()
            page.wait_for_timeout(2500)
            check(
                "削除できた",
                "削除しました" in page.locator("body").inner_text()
                or "削除するものはありませんでした" in page.locator("body").inner_text(),
            )
        else:
            check("消せる記録がある", False, "履歴が1件も無く確認できなかった")

        # ── まとめて削除のシート ────────────────────────
        page.get_by_role("button", name="まとめて削除").first.click()
        sheet = page.get_by_role("dialog", name=re.compile("削除"))
        sheet.wait_for(state="visible", timeout=6000)
        sheet_text = sheet.inner_text()
        check("期間を選べる", "7日より古いものを削除" in sheet_text)
        check("すべて削除も選べる", "すべて削除" in sheet_text)
        check("影響の説明がある", "アプリの動きには影響しません" in sheet_text)
        page.screenshot(path=f"{SHOT_DIR}/pr27-purge-sheet.png")
        sheet.get_by_role("button", name="閉じる").click()
        page.wait_for_timeout(500)

        # ── 監査ログ ────────────────────────────────────
        page.goto(f"{BASE}/admin/audit", wait_until="domcontentloaded")
        page.get_by_role("heading", name="監査ログ").first.wait_for(timeout=8000)
        audit = page.locator("body").inner_text()
        check("1件ずつ消せないと書いてある", "1件ずつは削除できません" in audit)
        check(
            "監査ログには選択の枠が無い",
            page.get_by_role("checkbox", name=re.compile("を選択$")).count() == 0,
        )

        page.get_by_role("button", name="まとめて削除").first.click()
        asheet = page.get_by_role("dialog", name=re.compile("監査ログの削除"))
        asheet.wait_for(state="visible", timeout=6000)
        atext = asheet.inner_text()
        check("理由の入力欄がある", "削除する理由" in atext)
        check("すべて削除は出さない", "すべて削除" not in atext)
        check("30日より新しいものは消せないと書いてある", "30日より新しいもの" in atext)
        page.screenshot(path=f"{SHOT_DIR}/pr27-audit-purge.png")

        # 理由なしで押すと止まること。
        asheet.get_by_role("button", name=re.compile("90日より古いものを削除")).click()
        page.wait_for_timeout(1200)
        check(
            "理由がないと実行できない",
            "理由の入力が必要" in page.locator("body").inner_text(),
        )

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
