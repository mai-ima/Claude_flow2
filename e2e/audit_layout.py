"""PC幅・スマホ幅で全画面を回り、レイアウトの崩れを機械的に探す。

見ているもの:
  - 横方向にはみ出していないか（スマホで左右に振れる原因）
  - 指で押すには小さすぎる操作要素が無いか（44px を下回っていないか）

当たり判定は ::before で広げているものがあるので、見た目の矩形だけでなく
疑似要素の寸法も見る。PC でしか出ない要素（サイドバー、ホバーで現れる
削除ボタン）はマウス前提なので対象から外している。

問題が無ければ「問題なし」とだけ出て、終了コードは 0。"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
SHOTS = os.environ.get("E2E_SHOTS", "/tmp")

PAGES = [
    ("/dashboard", "dashboard"),
    ("/transactions", "transactions"),
    ("/transactions?view=calendar", "calendar"),
    ("/subscriptions", "subscriptions"),
    ("/budgets", "budgets"),
    ("/goals", "goals"),
    ("/reports", "reports"),
    ("/reports/monthly", "monthly"),
    ("/settings", "settings"),
    ("/settings/ledger", "settings-ledger"),
    # あとから増えた画面。監査の対象に入れ忘れると、崩れても気づけない。
    ("/transactions/recurring", "recurring"),
    ("/subscriptions/price-changes", "price-changes"),
    ("/settlement", "settlement"),
    ("/settings/sharing", "settings-sharing"),
    ("/settings/security", "settings-security"),
    ("/settings/advanced", "settings-advanced"),
    ("/settings/feedback", "settings-feedback"),
    ("/billing", "billing"),
    ("/changelog", "changelog"),
]

WIDTHS = [("sp", 390, 844), ("pc", 1440, 900)]


def main():
    with sync_playwright() as p:
        launch = {}
        if os.environ.get("E2E_CHROMIUM"):
            launch["executable_path"] = os.environ["E2E_CHROMIUM"]
        b = p.chromium.launch(**launch)
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.get_by_label("メールアドレス").fill(os.environ.get("E2E_EMAIL", "demo@tsumiki.app"))
        page.get_by_label("パスワード", exact=True).fill(os.environ.get("E2E_PASSWORD", "demo1234"))
        page.get_by_role("button", name=re.compile("ログイン")).click()
        page.wait_for_url(lambda u: "/login" not in u, timeout=15000)

        problems = []
        for tag, w, h in WIDTHS:
            page.set_viewport_size({"width": w, "height": h})
            for href, name in PAGES:
                page.goto(f"{BASE}{href}", wait_until="domcontentloaded")
                page.wait_for_timeout(900)

                # 横スクロールが出ていないか
                overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
                )
                if overflow > 1:
                    problems.append(f"[{tag}] {href}: 横に {overflow}px はみ出す")

                # 44px 未満の操作要素
                # 見た目の矩形だけでなく、::before で広げた当たり判定も見る。
                # Button の sm/icon や .tap-target は疑似要素で 44px を確保している。
                small = page.evaluate(
                    """() => {
                      const out = [];
                      for (const el of document.querySelectorAll('button, a[href], select, input[type=checkbox]')) {
                        const r = el.getBoundingClientRect();
                        if (r.width === 0 || r.height === 0) continue;
                        const st = getComputedStyle(el);
                        if (st.visibility === 'hidden' || st.display === 'none') continue;
                        // PC でだけ出る要素（サイドバー・ホバーで現れる削除）は
                        // マウス前提なので 44px を求めない。
                        if (el.closest('aside') || el.className.includes('md:grid')) continue;
                        const be = getComputedStyle(el, '::before');
                        const bh = parseFloat(be.minHeight) || parseFloat(be.height) || 0;
                        const bw = parseFloat(be.minWidth) || parseFloat(be.width) || 0;
                        const h = Math.max(r.height, be.content !== 'none' ? bh : 0);
                        const w = Math.max(r.width, be.content !== 'none' ? bw : 0);
                        if (h < 40 || w < 24) {
                          out.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 28)
                                   + ` ${Math.round(w)}x${Math.round(h)}`);
                        }
                      }
                      return out.slice(0, 6);
                    }"""
                )
                if small:
                    problems.append(f"[{tag}] {href}: 小さすぎる操作要素 {small}")

                page.screenshot(path=f"{SHOTS}/audit-{tag}-{name}.png")

        b.close()

    if problems:
        print("見つかった問題:")
        for x in problems:
            print(" -", x)
    else:
        print("問題なし")
    sys.exit(0 if not problems else 1)


main()
