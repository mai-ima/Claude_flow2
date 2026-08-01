"""お知らせの削除と、初期状態に戻したときの案内（PR28）を実画面で見る。

見ているもの:
  - お知らせを1件ずつ消せること、読んだものだけまとめて消せること
  - 「すべてのデータを削除」のあと、使い始めの案内が戻ること
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

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def login(page, email=EMAIL, password=PASSWORD):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_label("メールアドレス").fill(email)
    page.get_by_label("パスワード", exact=True).fill(password)
    page.get_by_role("button", name=re.compile("ログイン")).click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)


def seed_notifications(browser, n=3):
    """管理の配信から、確認に使うお知らせを用意する。

    前の実行で消しきっていると、次の実行では消す対象が無く
    「削除ボタンがある」を確かめられない。テストの中で作る。
    """
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    for i in range(n):
        page.goto(f"{BASE}/admin/content", wait_until="domcontentloaded")
        page.get_by_role("heading", name="コンテンツ運用").first.wait_for(timeout=8000)
        page.get_by_label("件名").fill(f"確認用のお知らせ{i + 1}")
        page.get_by_label("本文").fill("削除の確認に使います。")
        page.get_by_role("button", name="送信する").click()
        # 送信先が広いので、確認のダイアログを挟む作りになっている。
        dlg = page.get_by_role("dialog", name=re.compile("お知らせを送りますか"))
        dlg.wait_for(state="visible", timeout=6000)
        dlg.get_by_role("button", name="送信する").click()
        page.wait_for_timeout(2500)
    ctx.close()


def open_bell(page):
    page.get_by_role("button", name="通知").first.click()
    page.wait_for_timeout(700)


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        seed_notifications(browser)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        login(page)

        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)

        # ── お知らせの削除 ──────────────────────────────
        open_bell(page)
        removes = page.get_by_role("button", name=re.compile("^「.+」を消す$"))
        before = removes.count()
        check("お知らせに削除ボタンがある", before > 0, f"{before}件")
        page.screenshot(path=f"{SHOT_DIR}/pr28-bell.png")

        if before > 0:
            removes.first.click()
            page.wait_for_timeout(2500)
            # 数え直しは読み込み直してから。パネルを開いたまま数えると、
            # 再描画が届く前の並びを見てしまう。
            page.reload(wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            open_bell(page)
            after = page.get_by_role("button", name=re.compile("^「.+」を消す$")).count()
            check("1件消すと減る", after == before - 1, f"{before} → {after}")

            # 「すべて既読」→「読んだものを消す」で空になること。
            read_all = page.get_by_role("button", name="すべて既読")
            if read_all.count() > 0:
                read_all.first.click()
                page.wait_for_timeout(2500)
                page.reload(wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                open_bell(page)
            clear = page.get_by_role("button", name="読んだものを消す")
            check("読んだものを消す入口がある", clear.count() > 0)
            if clear.count() > 0:
                clear.first.click()
                page.wait_for_timeout(2500)
                page.reload(wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                open_bell(page)
                body = page.locator("body").inner_text()
                check("空になる", "通知はありません" in body)
                page.screenshot(path=f"{SHOT_DIR}/pr28-bell-empty.png")

        # ── 初期状態に戻すと案内が戻る ──────────────────
        page.goto(f"{BASE}/settings/advanced", wait_until="domcontentloaded")
        page.get_by_role("heading", name="データとその他").first.wait_for(timeout=8000)

        body = page.locator("body").inner_text()
        check("全削除の入口がある", "すべての記録を削除" in body)
        check(
            "何が消えるかを書いてある",
            "使い始めたときの状態に戻します" in body,
        )
        btn = page.get_by_role("button", name="削除", exact=True)
        if btn.count() > 0:
            btn.first.click()
            dlg = page.get_by_role("dialog", name=re.compile("すべての記録を削除"))
            dlg.wait_for(state="visible", timeout=6000)
            check(
                "案内が戻ることを断っている",
                "使い始めのご案内がもう一度表示されます" in dlg.inner_text(),
            )
            page.screenshot(path=f"{SHOT_DIR}/pr28-delete-all.png")
            page.get_by_label("全データ削除の確認: 削除と入力").fill("削除")
            dlg.get_by_role("button", name="完全に削除する").click()
            page.wait_for_timeout(5000)

            page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            home = page.locator("body").inner_text()
            check(
                "使い始めの案内が戻る",
                "はじめ" in home or "最初" in home or "3つ" in home,
                home[:120].replace("\n", " "),
            )
            page.screenshot(path=f"{SHOT_DIR}/pr28-onboarding.png", full_page=True)

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
