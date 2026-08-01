"""金額を入れる欄で、1文字ごとに別の項目へ移らないことを確かめる。

以前は予算の欄で1文字打つたびに上のセレクトへ飛び、2文字目以降が
入らなかった。同じ作りの欄が他にもあるので、まとめて見る。

判定は「同じ要素にフォーカスが残っているか」で行う。
タグ名（INPUT かどうか）だけを見ると、隣の入力欄に移っていても
気づけない。実際そのせいで見逃していた。
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


def type_and_watch(page, field, digits="12345"):
    """1文字ずつ打ちながら、フォーカスが動かないか見張る。

    戻り値: (最終的な値, 途中で移った先のリスト)
    """
    field.click()
    page.wait_for_timeout(200)
    # いま触っている要素に印を付け、毎回それと同じかを見る。
    page.evaluate("() => { document.activeElement.dataset.e2eWatch = '1'; }")
    strayed = []
    for ch in digits:
        page.keyboard.type(ch)
        page.wait_for_timeout(120)
        where = page.evaluate(
            """() => {
              const el = document.activeElement;
              if (!el) return 'なし';
              if (el.dataset && el.dataset.e2eWatch === '1') return 'same';
              return (el.getAttribute('aria-label') || el.tagName) + '';
            }"""
        )
        if where != "same":
            strayed.append(where)
    return field.input_value(), strayed


def case(page, name, path, open_button, label, extra=None):
    page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    btn = page.get_by_role("button", name=open_button).first
    if btn.count() == 0:
        check(f"{name}: 入口が見つかる", False, str(open_button))
        return
    btn.click()
    page.wait_for_timeout(900)
    if extra:
        extra(page)
    field = page.get_by_label(label).first
    try:
        field.wait_for(state="visible", timeout=6000)
    except Exception:
        check(f"{name}: 金額欄が出る", False, label)
        return
    value, strayed = type_and_watch(page, field)
    check(
        f"{name}: 5文字とも入る",
        value.replace(",", "").endswith("12345"),
        f"値={value!r}",
    )
    check(
        f"{name}: 入力中に別の項目へ移らない",
        not strayed,
        f"移った先={strayed}" if strayed else "",
    )
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)


def main():
    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        login(page)

        case(page, "予算", "/budgets", re.compile("予算を(追加|設定)"), "月の予算額")
        case(page, "貯金目標", "/goals", re.compile("目標を(追加|作る|設定)"), "目標額")
        case(page, "記録", "/transactions", re.compile("記録する|追加"), "金額")
        case(page, "定期の記録", "/transactions/recurring", re.compile("追加|登録"), "金額")
        case(page, "サブスク", "/subscriptions", re.compile("サブスクを(追加|登録)|追加"), "金額")
        # 資産は分析の「資産」タブの中にある。タブを切り替えてから開く。
        def to_savings(pg):
            tab = pg.get_by_role("radio", name="資産")
            if tab.count() > 0:
                tab.first.click()
                pg.wait_for_timeout(900)

        page.goto(f"{BASE}/reports", wait_until="domcontentloaded")
        page.wait_for_timeout(1400)
        to_savings(page)
        opener = page.get_by_role("button", name=re.compile("記録する"))
        if opener.count() > 0:
            opener.first.click()
            page.wait_for_timeout(900)
            field = page.get_by_label("残高").first
            if field.count() > 0:
                value, strayed = type_and_watch(page, field)
                check("資産: 5文字とも入る", value.replace(",", "").endswith("12345"), f"値={value!r}")
                check("資産: 入力中に別の項目へ移らない", not strayed, f"移った先={strayed}")
                page.keyboard.press("Escape")
            else:
                check("資産: 残高の欄が出る", False)
        else:
            check("資産: 記録する入口がある", False, "資産タブに見当たらない")

        # 精算は共有帳簿があるときだけ出る。無い環境では確かめられないので、
        # 落とさずに「確認できなかった」ことだけ残す。
        page.goto(f"{BASE}/settlement", wait_until="domcontentloaded")
        page.wait_for_timeout(1400)
        s_open = page.get_by_role("button", name=re.compile("記録する"))
        if s_open.count() > 0:
            s_open.first.click()
            page.wait_for_timeout(900)
            field = page.get_by_label("金額").first
            if field.count() > 0:
                value, strayed = type_and_watch(page, field)
                check("精算: 5文字とも入る", value.replace(",", "").endswith("12345"), f"値={value!r}")
                check("精算: 入力中に別の項目へ移らない", not strayed, f"移った先={strayed}")
                page.keyboard.press("Escape")
        else:
            print("skip 精算: 共有帳簿が無いため確認せず")

        # 想定時給はシートではなく、設定の画面にそのまま置いてある。
        page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
        page.wait_for_timeout(1400)
        wage = page.get_by_label(re.compile("^想定時給")).first
        if wage.count() > 0:
            value, strayed = type_and_watch(page, wage, digits="2000")
            check("想定時給: 4文字とも入る", value.replace(",", "").endswith("2000"), f"値={value!r}")
            check("想定時給: 入力中に別の項目へ移らない", not strayed, f"移った先={strayed}")
        else:
            check("想定時給の欄がある", False)

        page.screenshot(path=f"{SHOT_DIR}/amount-focus.png")
        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
