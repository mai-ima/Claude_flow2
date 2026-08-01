"""件数の数え方とカレンダーの集計（PR25）を実画面で見る。

見ているもの:
  - サブスクの「登録数」と「残り枠」が同じ数え方になっていること
    （画面が3件と言うのに追加が断られる、が起きない）
  - カレンダーの日ごとの金額が、明細の上限に影響されないこと
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = os.environ.get("E2E_EMAIL", "demo@tsumiki.app")
PASSWORD = os.environ.get("E2E_PASSWORD", "demo1234")

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def yen(text):
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

        # ── サブスクの件数 ──────────────────────────────
        page.goto(f"{BASE}/subscriptions", wait_until="domcontentloaded")
        page.get_by_role("heading", name="サブスク").first.wait_for(timeout=8000)
        body = page.locator("body").inner_text()

        check("登録数が出る", "登録数" in body)
        check("何を数えているか書いてある", "解約済みを除く" in body)

        # 画面の登録数と、一覧で「解約済み」以外の行数が一致すること
        shown = re.search(r"登録数\s*\n?\s*(\d+)件", body)
        check("登録数を読み取れる", shown is not None, body[body.find("登録数"):][:30].replace("\n", " "))

        # 解約済みで絞り込んで、その分が登録数に入っていないことを見る
        page.get_by_label("ステータスで絞り込み").select_option("CANCELED")
        page.wait_for_timeout(600)
        canceled_rows = page.locator("main .space-y-3 > *").count()
        page.get_by_label("ステータスで絞り込み").select_option("ALL")
        page.wait_for_timeout(600)
        all_rows = page.locator("main .space-y-3 > *").count()
        if shown:
            check(
                "登録数は解約済みを含まない",
                int(shown.group(1)) == all_rows - canceled_rows,
                f"画面 {shown.group(1)}件 / 全 {all_rows}件 - 解約済み {canceled_rows}件",
            )

        # ── カレンダーの集計 ────────────────────────────
        page.goto(f"{BASE}/transactions?view=calendar", wait_until="domcontentloaded")
        page.get_by_role("heading", name="家計簿").first.wait_for(timeout=8000)
        page.wait_for_timeout(800)
        cal = page.locator("body").inner_text()

        # 上のサマリーはカレンダーの日別集計から作っている。
        # リスト表示の合計と一致すれば、集計が打ち切られていない。
        cal_expense = None
        m = re.search(r"支出\s*\n?\s*[¥￥]([\d,]+)", cal)
        if m:
            cal_expense = int(m.group(1).replace(",", ""))

        page.goto(f"{BASE}/transactions", wait_until="domcontentloaded")
        page.wait_for_timeout(800)
        lst = page.locator("body").inner_text()
        list_expense = None
        m = re.search(r"支出\s*\n?\s*[¥￥]([\d,]+)", lst)
        if m:
            list_expense = int(m.group(1).replace(",", ""))

        check(
            "カレンダーとリストで支出の合計が一致する",
            cal_expense is not None and cal_expense == list_expense,
            f"カレンダー {cal_expense} / リスト {list_expense}",
        )

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
