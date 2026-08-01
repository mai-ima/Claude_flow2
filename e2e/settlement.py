"""共有帳簿の精算（PR19）を実画面で見る。

見ているもの:
  - 負担額・払った額・差引が並び、金額の出どころを追えること
  - やり取りの案が出て、その場で記録でき、記録すると差引が減ること
  - 負担の割合を比で設定でき、入力中に%が見えること
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = os.environ.get("E2E_EMAIL", "demo@tsumiki.app")
PASSWORD = os.environ.get("E2E_PASSWORD", "demo1234")
POD_NAME = os.environ.get("E2E_POD", "山田家の共有")
SHOT_DIR = os.environ.get("E2E_SHOTS", "/tmp")

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def money(text):
    """「￥62,000」のような表記から整数を取り出す。"""
    m = re.search(r"[\d,]+", text)
    return int(m.group(0).replace(",", "")) if m else None


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

        # 共有帳簿に切り替える。個人帳簿のままだと精算は使えない。
        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page.get_by_role("button", name=re.compile("帳簿|切替|山田")).first.click()
        page.get_by_text(POD_NAME, exact=False).first.click()
        page.wait_for_timeout(1200)

        # 共有帳簿でだけナビに「精算」が出る
        page.goto(f"{BASE}/settlement", wait_until="domcontentloaded")
        page.get_by_role("heading", name="精算").first.wait_for(timeout=8000)
        body = page.locator("body").inner_text()

        check("メンバーの差引が出る", "本来の負担" in body and "実際に払った" in body)
        check("差引の見出しがある", "差引" in body)
        check("やり取りの案が出る", "やり取りの案" in body)
        check(
            "払った人が未記入の分を断っている",
            "払った方が未記入" in body,
            "5,300円ぶんの注記",
        )

        # 3:2 の比なので 60% / 40%
        check("負担の割合が出る", "負担 60%" in body and "負担 40%" in body, )

        # 合計 110,000 / 山田太郎 66,000・花子 44,000
        # 払ったのは 太郎 80,400・花子 24,300
        check("支出の合計が出る", money(body.split("の支出")[1][:40]) == 110000,
              str(money(body.split("の支出")[1][:40])))

        page.screenshot(path=f"{SHOT_DIR}/settlement.png", full_page=True)

        # ── やり取りの案から記録する ──────────────────
        # 前回の実行で残った履歴を消してから始める。残っていると
        # 「記録すると履歴に載る」が確かめられない。
        while page.get_by_role("button", name="この精算を取り消す").count() > 0:
            page.get_by_role("button", name="この精算を取り消す").first.click()
            dlg = page.get_by_role("dialog", name=re.compile("取り消"))
            dlg.wait_for(state="visible", timeout=5000)
            dlg.get_by_role("button", name=re.compile("取り消|削除")).first.click()
            page.wait_for_timeout(1800)

        before = page.locator("body").inner_text()
        check("記録前は履歴が空", "まだ記録がありません" in before)

        page.get_by_role("button", name="記録する").first.click()
        sheet = page.get_by_role("dialog", name="精算を記録")
        sheet.wait_for(state="visible", timeout=5000)
        check(
            "家計簿は変わらないと断っている",
            "家計簿の記録は変わりません" in sheet.inner_text(),
        )
        page.get_by_role("button", name="記録する").last.click()
        page.wait_for_timeout(1500)

        after = page.locator("body").inner_text()
        check("履歴に載る", "まだ記録がありません" not in after)
        check("精算済みの行が出る", "精算で受け渡し済み" in after)
        check("差引が解消される", "いまのところ精算は不要です" in after, )

        # ── 負担の割合 ────────────────────────────────
        page.get_by_role("button", name="負担の割合を変える").click()
        ratio = page.get_by_role("dialog", name="負担の割合")
        ratio.wait_for(state="visible", timeout=5000)
        check("比であることを説明している", "数字は「比」です" in ratio.inner_text())
        check("均等にするボタンがある", ratio.get_by_role("button", name="均等にする").count() == 1)
        page.screenshot(path=f"{SHOT_DIR}/share-ratio.png")

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
