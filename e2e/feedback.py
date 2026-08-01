"""要望・不具合の報告（PR26）を実画面で見る。

見ているもの:
  - 設定から送れること
  - 何を一緒に送るのかを、送る前に伝えていること
  - 管理画面に届き、対応状況を変えられること
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = os.environ.get("E2E_EMAIL", "demo@tsumiki.app")
PASSWORD = os.environ.get("E2E_PASSWORD", "demo1234")
ADMIN_EMAIL = os.environ.get("E2E_ADMIN_EMAIL", "admin@tsumiki.app")
ADMIN_PASSWORD = os.environ.get("E2E_ADMIN_PASSWORD", "AdminTest12345!")
SHOT_DIR = os.environ.get("E2E_SHOTS", "/tmp")

BODY = "テスト送信: 予算の画面で保存を押しても何も起きません。"

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def login(page, email, password):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_label("メールアドレス").fill(email)
    page.get_by_label("パスワード", exact=True).fill(password)
    page.get_by_role("button", name=re.compile("ログイン")).click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)

        # ── 利用者として送る ────────────────────────────
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        login(page, EMAIL, PASSWORD)

        page.goto(f"{BASE}/settings/advanced", wait_until="domcontentloaded")
        page.get_by_role("heading", name="データとその他").first.wait_for(timeout=8000)
        body = page.locator("body").inner_text()
        check("設定に入口がある", "ご意見・不具合" in body)

        page.get_by_role("button", name="ご意見・不具合を送る").click()
        sheet = page.get_by_role("dialog", name=re.compile("ご意見"))
        sheet.wait_for(state="visible", timeout=6000)
        sheet_text = sheet.inner_text()

        check("種類を選べる", "不具合のご報告" in sheet_text and "機能のご要望" in sheet_text)
        check(
            "何を一緒に送るか書いてある",
            "画面の場所" in sheet_text and "端末の種類" in sheet_text,
        )
        check(
            "家計簿の中身は送らないと明記している",
            "金額やメモが送られることはありません" in sheet_text,
        )

        page.get_by_role("textbox", name=re.compile("^内容")).fill(BODY)
        page.screenshot(path=f"{SHOT_DIR}/feedback-sheet.png")
        page.get_by_role("button", name="送信する").click()
        page.wait_for_timeout(2500)
        check("送信できる", "ご意見・不具合を送る" in page.locator("body").inner_text())

        ctx.close()

        # ── 管理者として受け取る ────────────────────────
        actx = browser.new_context(viewport={"width": 1280, "height": 900})
        apage = actx.new_page()
        login(apage, ADMIN_EMAIL, ADMIN_PASSWORD)

        apage.goto(f"{BASE}/admin/feedback", wait_until="domcontentloaded")
        apage.get_by_role("heading", name="ご意見・不具合").first.wait_for(timeout=8000)
        admin_body = apage.locator("body").inner_text()

        check("管理画面に届いている", BODY in admin_body, )
        check("件数の内訳が出る", "未対応" in admin_body and "対応済み" in admin_body)
        check("送信元の画面が分かる", "/settings/advanced" in admin_body)
        check("端末が分かる", "送り主" in admin_body and "端末" in admin_body)

        # 対応状況を変える
        apage.get_by_label("対応状況").first.select_option("READING")
        apage.wait_for_timeout(2000)
        check("対応状況を変えられる", "確認中" in apage.locator("body").inner_text())
        apage.screenshot(path=f"{SHOT_DIR}/feedback-admin.png")

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
