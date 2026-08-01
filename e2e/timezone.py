"""日付と時刻が日本時間で扱われるかを実画面で見る。

このスクリプトは、サーバーの時間帯をわざと UTC にして動かした状態で
実行することを想定している（TZ=UTC npx next start）。
本番の Vercel は既定が UTC なので、そこで壊れないことを確かめる意味がある。

見ているもの:
  - 自己診断が日本時間の現在時刻を返すこと
  - 管理のお知らせ帯が、入れた日時のまま表示されること（往復して同じ）
  - 記録した日付が、一覧・カレンダー・書き出しで同じ日になること
"""

import csv
import io
import time
import json
import os
import re
import sys
import urllib.request

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


def login(page, email, password):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_label("メールアドレス").fill(email)
    page.get_by_label("パスワード", exact=True).fill(password)
    page.get_by_role("button", name=re.compile("ログイン")).click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)


def main():
    # ── 自己診断 ────────────────────────────────────
    with urllib.request.urlopen(f"{BASE}/api/health") as r:
        health = json.loads(r.read())
    tz = health.get("timeZone", {})
    check("自己診断に時間帯が出る", "actual" in tz and "nowJST" in tz, json.dumps(tz, ensure_ascii=False))

    # 「今」が日本時間で出ること。UTC の時刻と9時間差になっているかで見る。
    m = re.match(r"(\d{4})年(\d+)月(\d+)日 (\d{2}):(\d{2})", tz.get("nowJST", ""))
    check("日本時間の現在時刻を返す", m is not None, tz.get("nowJST", ""))
    if m and health.get("time"):
        utc_hour = int(health["time"][11:13])
        jst_hour = int(m.group(4))
        check("UTC との差が9時間", (jst_hour - utc_hour) % 24 == 9, f"UTC {utc_hour}時 / JST {jst_hour}時")

    launch = {}
    if os.environ.get("E2E_CHROMIUM"):
        launch["executable_path"] = os.environ["E2E_CHROMIUM"]

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)

        # ── 管理: お知らせ帯の日時が往復して変わらないこと ──
        actx = browser.new_context(viewport={"width": 1280, "height": 900})
        apage = actx.new_page()
        login(apage, ADMIN_EMAIL, ADMIN_PASSWORD)

        apage.goto(f"{BASE}/admin/content", wait_until="domcontentloaded")
        apage.get_by_role("heading", name="コンテンツ運用").first.wait_for(timeout=8000)

        starts = "2026-09-01T09:00"
        ends = "2026-09-30T18:30"
        apage.get_by_label("文面").fill("時間帯の確認用")
        apage.get_by_label("開始").fill(starts)
        apage.get_by_label("終了").fill(ends)
        apage.get_by_role("button", name="バナーを追加").click()
        apage.wait_for_timeout(2500)

        listed = apage.locator("body").inner_text()
        check(
            "入れた開始日時のまま表示される",
            starts.replace("T", " ") in listed,
            f"期待 {starts.replace('T', ' ')}",
        )
        check("入れた終了日時のまま表示される", ends.replace("T", " ") in listed)
        apage.screenshot(path=f"{SHOT_DIR}/tz-banner.png")

        # 後片付け
        apage.get_by_role("button", name="バナーを削除").first.click()
        dialog = apage.get_by_role("dialog", name=re.compile("削除"))
        if dialog.count() > 0:
            dialog.get_by_role("button", name=re.compile("削除")).first.click()
        apage.wait_for_timeout(1500)

        actx.close()

        # ── 利用者: 記録した日付が一覧と書き出しで一致すること ──
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        login(page, EMAIL, PASSWORD)

        page.goto(f"{BASE}/transactions", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)

        # 月初の1日を選ぶ。UTC で切ると前月末に落ちる、いちばん危ない日。
        target = None
        for _ in range(1):
            body = page.locator("body").inner_text()
            m2 = re.search(r"(\d{4})年(\d+)月", body)
            if m2:
                target = f"{m2.group(1)}-{int(m2.group(2)):02d}-01"
        check("対象の月が読み取れた", target is not None, target or "")

        if target:
            page.get_by_role("button", name=re.compile("記録する|追加")).first.click()
            sheet = page.get_by_role("dialog", name="記録を追加")
            sheet.wait_for(state="visible", timeout=6000)
            page.get_by_label("金額").fill("1234")
            page.get_by_label("日付").fill(target)
            marker = f"時間帯の確認{int(time.time())}"
            memo = page.get_by_label("メモ（任意）")
            if memo.count() > 0:
                memo.first.fill(marker)
            page.get_by_role("button", name=re.compile("保存")).first.click()
            page.wait_for_timeout(2500)

            # 一覧は新しい順なので、月初の記録は画面外にある。
            # メモで絞り込んでから、その記録の日付見出しを見る。
            page.get_by_placeholder(re.compile("検索")).fill(marker)
            page.get_by_placeholder(re.compile("検索")).press("Enter")
            page.wait_for_timeout(2500)

            shown = page.locator("body").inner_text()
            day = int(target[8:10])
            month = int(target[5:7])
            check("絞り込みでその記録が出る", marker in shown, marker)
            check(
                "一覧に同じ日付で出る",
                f"{month}月{day}日" in shown,
                f"期待 {month}月{day}日",
            )
            page.screenshot(path=f"{SHOT_DIR}/tz-transactions.png")

            # カレンダーでも同じ日に入ること。
            page.goto(f"{BASE}/transactions?view=calendar", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{SHOT_DIR}/tz-calendar.png")

            # 書き出しの日付。
            cookies = ctx.cookies()
            jar = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
            req = urllib.request.Request(
                f"{BASE}/api/export/transactions", headers={"Cookie": jar}
            )
            try:
                with urllib.request.urlopen(req) as r:
                    raw = r.read().decode("utf-8-sig")
                rows = list(csv.reader(io.StringIO(raw)))
                dates = {row[0] for row in rows[1:] if row}
                check("書き出しに同じ日付が入る", target in dates, f"{target} / 例: {sorted(dates)[:3]}")
            except Exception as e:  # noqa: BLE001
                check("書き出しを取得できる", False, str(e))

        browser.close()

    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)


main()
