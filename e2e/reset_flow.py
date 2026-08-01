"""パスワード再設定とメール確認を、実ブラウザ + 実データベースで確かめる。

メール送信は Resend への HTTP なので、ブラウザではなくサーバー側から出ていく。
Playwright では覗けないため、トークンはデータベースから取り出す（メールに
載る値と同じものが作れることは verification-token.test.ts で担保済み）。
ここで見たいのは「リンクを開いた先で本当に再設定できるか」。
"""

import hashlib
import re
import subprocess
import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3000")
EMAIL = f"reset{int(time.time())}@example.test"
PW_OLD = "oldpassword1"
PW_NEW = "newpassword2"

DB_NAME = os.environ.get("E2E_DB", "tsumiki_e2e")

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" :: {detail}" if detail else ""))


def psql(sql):
    out = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-p", "5433", "-U", "postgres", "-tAc", sql, DB_NAME],
        capture_output=True, text=True,
    )
    return out.stdout.strip()


# Next.js は画面読み上げ用に role="alert" の空 div を常に置いている。
# それを数えると「もう結果が出た」と誤判定するので、必ず除外する。
LIVE = '[role="alert"]:not(#__next-route-announcer__), [role="status"]'


def settle(page, from_path):
    """送信の結果が出るまで待つ。

    遷移中のローディング表示も role="status" を持つため、live 領域全般を
    見ると「まだ元の画面にいるのに結果が出た」と誤判定する。
    元のパスを離れたか、フォーム内にエラーが出たか、だけを見る。
    """
    for _ in range(75):
        if from_path not in page.url:
            return
        if page.locator('form [role="alert"]').count() > 0:
            return
        page.wait_for_timeout(200)


def signup(page, email, password):
    page.goto(f"{BASE}/signup", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.get_by_role("button", name="アカウントを作成").click()
    settle(page, "/signup")


def login(page, email, password):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.get_by_role("button", name="ログイン").click()
    settle(page, "/login")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get("E2E_CHROMIUM") or None)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.set_default_navigation_timeout(60000)

    signup(page, EMAIL, PW_OLD)
    check("新規登録できる", "/billing" in page.url or "/dashboard" in page.url, page.url)

    # ログインしたまま別タブで再設定を申し込む想定は避け、いったんログアウト状態にする
    ctx2 = browser.new_context()
    anon = ctx2.new_page()
    anon.set_default_navigation_timeout(60000)

    # ログイン画面から導線があること
    anon.goto(f"{BASE}/login", wait_until="domcontentloaded")
    anon.wait_for_load_state("domcontentloaded")
    check("ログイン画面に再設定への導線がある", anon.locator('a[href="/forgot-password"]').count() > 0)

    # 存在しないアドレスと、存在するアドレスで文言が同じこと
    anon.goto(f"{BASE}/forgot-password", wait_until="domcontentloaded")
    anon.wait_for_load_state("domcontentloaded")
    anon.fill('input[name="email"]', "nobody-here-zzz@example.test")
    anon.get_by_role("button", name="再設定のご案内を送る").click()
    anon.wait_for_selector(LIVE, timeout=20000)
    msg_unknown = anon.locator(LIVE).first.inner_text()

    anon.goto(f"{BASE}/forgot-password", wait_until="domcontentloaded")
    anon.wait_for_load_state("domcontentloaded")
    anon.fill('input[name="email"]', EMAIL)
    anon.get_by_role("button", name="再設定のご案内を送る").click()
    anon.wait_for_selector(LIVE, timeout=20000)
    msg_known = anon.locator(LIVE).first.inner_text()

    check("登録の有無で文言が変わらない", msg_known == msg_unknown, f"{msg_known[:30]!r}")

    # 未登録アドレスにはトークンを作らない
    unknown_rows = psql("SELECT count(*) FROM \"VerificationToken\" WHERE identifier = 'reset:nobody-here-zzz@example.test'")
    check("未登録アドレスにはトークンを作らない", unknown_rows == "0", unknown_rows)

    # 登録済みにはトークンができている
    n = psql(f"SELECT count(*) FROM \"VerificationToken\" WHERE identifier = 'reset:{EMAIL}'")
    check("登録済みにはトークンができる", n == "1", n)

    # 保存されているのはハッシュであること（生の値が入っていない）
    stored = psql(f"SELECT token FROM \"VerificationToken\" WHERE identifier = 'reset:{EMAIL}'")
    check("保存されているのは64桁のハッシュ", bool(re.fullmatch(r"[0-9a-f]{64}", stored)), stored[:16])

    # メールに載る生トークンは手元に無いので、同じ方式で作り直して差し替える
    raw = "e2e-raw-token-" + str(int(time.time()))
    psql(
        f"UPDATE \"VerificationToken\" SET token = '{hashlib.sha256(raw.encode()).hexdigest()}' "
        f"WHERE identifier = 'reset:{EMAIL}'"
    )

    # トークン無しで開いた場合
    anon.goto(f"{BASE}/reset-password", wait_until="domcontentloaded")
    anon.wait_for_load_state("domcontentloaded")
    check("トークン無しでは設定できない", "リンクが正しくありません" in anon.inner_text("body"))

    # 正しいトークンで再設定
    anon.goto(f"{BASE}/reset-password?token={raw}", wait_until="domcontentloaded")
    anon.wait_for_load_state("domcontentloaded")
    anon.fill('input[name="password"]', PW_NEW)
    anon.fill('input[name="confirm"]', PW_NEW)
    anon.get_by_role("button", name="パスワードを設定する").click()
    anon.wait_for_selector(LIVE, timeout=20000)
    check("再設定が完了する", "変更しました" in anon.inner_text("body"), anon.inner_text("body")[:80])

    # 使い終わったトークンは消えている
    left = psql(f"SELECT count(*) FROM \"VerificationToken\" WHERE identifier = 'reset:{EMAIL}'")
    check("使ったトークンは残らない", left == "0", left)

    # 同じリンクをもう一度は使えない
    anon.goto(f"{BASE}/reset-password?token={raw}", wait_until="domcontentloaded")
    anon.wait_for_load_state("domcontentloaded")
    anon.fill('input[name="password"]', "another12345")
    anon.fill('input[name="confirm"]', "another12345")
    anon.get_by_role("button", name="パスワードを設定する").click()
    anon.wait_for_selector(LIVE, timeout=20000)
    check("同じリンクは二度使えない", "使えません" in anon.locator(LIVE).first.inner_text())

    # 新しいパスワードで入れる / 古いパスワードでは入れない
    ctx3 = browser.new_context()
    q = ctx3.new_page()
    q.set_default_navigation_timeout(60000)
    login(q, EMAIL, PW_NEW)
    check("新しいパスワードでログインできる", "/billing" in q.url or "/dashboard" in q.url, q.url)

    # ログイン済みの ctx3 を使い回すと /login が /dashboard へ飛ばされ、
    # 入力欄が無くなる。未ログインの窓を用意する。
    ctx4 = browser.new_context()
    r = ctx4.new_page()
    r.set_default_navigation_timeout(60000)
    login(r, EMAIL, PW_OLD)
    check("古いパスワードでは入れない", "/login" in r.url, r.url)

    # 再設定前からのセッションが無効になっていること
    page.goto(f"{BASE}/settings", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    check("再設定でそれまでのログインが切れる", "/login" in page.url, page.url)

    # 再設定を通ると確認済みになる
    verified = psql(f"SELECT \"emailVerified\" IS NOT NULL FROM \"User\" WHERE email = '{EMAIL}'")
    check("再設定を通るとメールは確認済みになる", verified == "t", verified)

    # 設定画面に確認状況が出る
    q.goto(f"{BASE}/settings", wait_until="domcontentloaded")
    # 設定画面はストリーミングで届く。domcontentloaded の時点では
    # まだ本文が揃っていないことがあるので、見たい文字が出るまで待つ。
    q.wait_for_selector("text=確認状況", timeout=30000)
    body = q.inner_text("body")
    check("設定画面に確認状況が出る", "確認状況" in body and "確認済み" in body)

    browser.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
