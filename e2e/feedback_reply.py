"""ご意見への返信と「送ったご報告」（PR27）を実画面で見る。

見ているもの:
  - 書きかけが消えないこと
  - 管理者の返信が、送った本人の画面とお知らせに届くこと
  - 内部メモが送り主に見えないこと
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

BODY = "返信テスト: サブスクの一覧で並び替えが効きません。"
REPLY = "ご報告ありがとうございます。並び替えの不具合を修正しました。"
NOTE = "内部メモ: 再現手順は Safari のみ"

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


def open_sheet(page):
    page.get_by_role("button", name="ご意見・不具合を送る").click()
    sheet = page.get_by_role("dialog", name=re.compile("ご意見"))
    sheet.wait_for(state="visible", timeout=6000)
    return sheet


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
        sheet = open_sheet(page)

        # 書きかけを残したまま閉じ、開き直しても消えていないこと。
        page.get_by_role("textbox", name=re.compile("^内容")).fill("書きかけの途中です")
        page.wait_for_timeout(400)
        sheet.get_by_role("button", name="閉じる").click()
        page.wait_for_timeout(600)
        sheet = open_sheet(page)
        restored = page.get_by_role("textbox", name=re.compile("^内容")).input_value()
        check("書きかけが残っている", restored == "書きかけの途中です", restored)

        # 書き方の型。
        page.get_by_role("textbox", name=re.compile("^内容")).fill("")
        page.wait_for_timeout(300)
        page.get_by_role("button", name="書き方の型を入れる").click()
        typed = page.get_by_role("textbox", name=re.compile("^内容")).input_value()
        check("書き方の型を入れられる", "どの画面で:" in typed and "どうなった:" in typed)

        page.get_by_role("textbox", name=re.compile("^内容")).fill(BODY)
        page.wait_for_timeout(300)
        page.screenshot(path=f"{SHOT_DIR}/pr27-sheet.png")
        page.get_by_role("button", name="送信する").click()
        page.wait_for_timeout(2500)

        body = page.locator("body").inner_text()
        check("送信後に「送ったご報告」への入口が出る", "送ったご報告" in body, )

        page.goto(f"{BASE}/settings/feedback", wait_until="domcontentloaded")
        page.get_by_role("heading", name="送ったご報告").first.wait_for(timeout=8000)
        mine = page.locator("body").inner_text()
        check("送った内容が自分の画面に出る", BODY in mine)
        check("対応状況が出る", "未読" in mine)
        page.screenshot(path=f"{SHOT_DIR}/pr27-my-reports.png", full_page=True)

        ctx.close()

        # ── 管理者として返信する ────────────────────────
        actx = browser.new_context(viewport={"width": 1280, "height": 900})
        apage = actx.new_page()
        login(apage, ADMIN_EMAIL, ADMIN_PASSWORD)

        apage.goto(f"{BASE}/admin/feedback", wait_until="domcontentloaded")
        apage.get_by_role("heading", name="ご意見・不具合").first.wait_for(timeout=8000)

        # 本文で探せること。
        apage.get_by_label("本文やメールアドレスで探す").fill("並び替え")
        apage.get_by_role("button", name="探す").click()
        apage.wait_for_timeout(1500)
        found = apage.locator("body").inner_text()
        check("本文で探せる", BODY in found)

        card = apage.locator("div").filter(has_text=BODY).last

        # 内部メモを書く。
        apage.get_by_role("button", name="メモ", exact=True).first.click()
        apage.get_by_label("対応メモ").fill(NOTE)
        apage.get_by_role("button", name="メモを保存").click()
        apage.wait_for_timeout(2000)

        # 返信を書く。
        apage.get_by_role("button", name="返信する").first.click()
        apage.get_by_label("送り主への返信").fill(REPLY)
        apage.screenshot(path=f"{SHOT_DIR}/pr27-admin-reply.png")
        apage.get_by_role("button", name="返信して対応済みにする").click()
        apage.wait_for_timeout(2500)

        admin_body = apage.locator("body").inner_text()
        check("返信済みの印が付く", "返信済み" in admin_body)
        check("返信した内容が管理画面に残る", REPLY in admin_body)
        check("内部メモも残る", NOTE in admin_body)
        apage.screenshot(path=f"{SHOT_DIR}/pr27-admin-feedback.png", full_page=True)

        actx.close()

        # ── 送り主として返信を受け取る ──────────────────
        ctx2 = browser.new_context(viewport={"width": 390, "height": 844})
        page2 = ctx2.new_page()
        login(page2, EMAIL, PASSWORD)

        page2.goto(f"{BASE}/settings/feedback", wait_until="domcontentloaded")
        page2.get_by_role("heading", name="送ったご報告").first.wait_for(timeout=8000)
        mine2 = page2.locator("body").inner_text()
        check("返信が届いている", REPLY in mine2)
        check("対応済みになっている", "対応済み" in mine2)
        check("内部メモは見えない", NOTE not in mine2, "見えてはいけない")
        page2.screenshot(path=f"{SHOT_DIR}/pr27-reply-received.png", full_page=True)

        # お知らせにも出ること。
        page2.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page2.wait_for_timeout(1500)
        page2.get_by_role("button", name="通知").first.click()
        page2.wait_for_timeout(1200)
        check(
            "お知らせにも返信が出る",
            "ご報告に返信があります" in page2.locator("body").inner_text(),
        )

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
