"""カテゴリ管理の表記と、金額欄の入力が続けられることを見る。

見ているもの:
  1. 予算の金額欄で複数文字を続けて打っても、フォーカスが上のセレクトへ
     移らないこと（シートの再描画でフォーカストラップが張り直されていた）
  2. カテゴリ管理の親子設定が、選ぶ前に何が起きるか読める表記であること
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


def login(page):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_label("メールアドレス").fill(EMAIL)
    page.get_by_label("パスワード", exact=True).fill(PASSWORD)
    page.get_by_role("button", name=re.compile("ログイン")).click()
    # 行き先は直前の操作で変わる（/billing に飛ぶこともある）。
    # 「/login を離れたか」だけを見る。
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        login(page)
        check("ログインできる", "/login" not in page.url, page.url)

        # ── 1. 金額欄で入力が続けられるか ──────────────────────
        page.goto(f"{BASE}/budgets", wait_until="domcontentloaded")
        page.get_by_role("button", name=re.compile("予算を(追加|設定)")).first.click()
        amount = page.get_by_label("月の予算額")
        amount.wait_for(state="visible", timeout=5000)
        amount.click()

        # 1文字ずつ打つ。以前は1文字目で上のセレクトへ飛び、2文字目以降が
        # 入力欄に入らなかった。
        page.keyboard.type("12345", delay=60)
        value = amount.input_value()
        focused = page.evaluate("() => document.activeElement?.tagName ?? ''")
        check("金額を続けて入力できる", "12345" in value.replace(",", ""), f"値={value!r}")
        check("入力中もフォーカスが金額欄に残る", focused == "INPUT", f"activeElement={focused}")

        page.keyboard.press("Escape")

        # ── 2. カテゴリ管理の表記 ────────────────────────────
        page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
        section = page.get_by_text("サブカテゴリ", exact=False).first
        section.wait_for(state="visible", timeout=5000)

        body = page.locator("body").inner_text()
        check("旧表記「まとめない」が残っていない", "まとめない" not in body)
        check("旧表記「の下」が残っていない", not re.search(r"[^\s]の下\b", body))
        check("説明が出ている", "サブカテゴリ" in body and "内訳" in body)
        check("支出/収入で分かれている", "支出のカテゴリ" in body)

        selects = page.get_by_label(re.compile("の集計のしかた$"))
        n = selects.count()
        check("集計のしかたを選べる", n > 0, f"{n}件")
        if n > 0:
            opts = selects.first.locator("option").all_inner_texts()
            check(
                "選択肢が結果まで書いてある",
                any("単独で集計する" in o for o in opts)
                and any("含めて集計する" in o for o in opts),
                " / ".join(opts[:3]),
            )

        page.screenshot(path="/tmp/claude-0/-home-user-Claude-flow2/001e99d1-975a-5152-9852-4f1ea7cda060/scratchpad/category-manager.png", full_page=False)
        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
