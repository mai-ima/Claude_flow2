"""オフライン時の振る舞い（PR24）を実ブラウザで見る。

いちばん確かめたいのは「圏外で古い金額が出ないこと」。
真っ白にならないことより、そちらのほうが大事。
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
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()

        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.get_by_label("メールアドレス").fill(EMAIL)
        page.get_by_label("パスワード", exact=True).fill(PASSWORD)
        page.get_by_role("button", name=re.compile("ログイン")).click()
        page.wait_for_url(lambda url: "/login" not in url, timeout=15000)

        # オフライン画面そのもの
        page.goto(f"{BASE}/offline", wait_until="domcontentloaded")
        body = page.locator("body").inner_text()
        check("理由が書いてある", "通信できません" in body)
        check("次にどうすればよいか書いてある", "電波の届く場所" in body or "Wi-Fi" in body)
        check("金額を出さないと断っている", "古い数字をお見せしない" in body)
        check(
            "金額が1つも出ていない",
            not re.search(r"[¥￥]\s*[\d,]+", body),
            re.search(r"[¥￥]\s*[\d,]+", body).group(0) if re.search(r"[¥￥]\s*[\d,]+", body) else "",
        )
        page.screenshot(path=f"{SHOT_DIR}/offline.png")

        # 実際に圏外にしてホームを開く
        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(800)
        online_body = page.locator("body").inner_text()
        check("オンラインでは金額が出る", re.search(r"[¥￥]\s*[\d,]+", online_body) is not None)

        # 登録は表示を邪魔しないよう 2 秒遅らせてある。有効化まで待つ。
        page.wait_for_timeout(4000)
        regs = page.evaluate(
            "async () => (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope)"
        )
        check("サービスワーカーが登録される", len(regs) > 0, ",".join(regs))
        if regs:
            page.evaluate("async () => { await navigator.serviceWorker.ready }")

        ctx.set_offline(True)
        try:
            page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded", timeout=10000)
            reached = True
        except Exception:
            reached = False
        offline_body = page.locator("body").inner_text() if reached else ""

        check("圏外でもオフライン画面が出る（真っ白にならない）",
              "通信できません" in offline_body, offline_body[:40].replace("\n", " "))

        # ここが本題。圏外で古い残高が出ないこと。
        money = re.search(r"[¥￥]\s*[\d,]+", offline_body)
        check("圏外で古い金額が出ない", money is None, money.group(0) if money else "")
        ctx.set_offline(False)

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
