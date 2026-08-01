# ブラウザ経由の確認

単体テスト（`npm run test`）では届かない範囲を、実際のブラウザと実際の
データベースで確かめる。ここに置いてあるのは、いずれも一度は本物の不具合を
見つけたか、直した不具合が戻っていないことを守るためのもの。

| ファイル | 見ているもの |
| --- | --- |
| `security_settings.py` | パスワード変更、ログイン中の端末一覧、ログイン失敗時の文言 |
| `reset_flow.py` | パスワード再設定、メールアドレスの確認 |
| `two_factor.py` | 二要素認証（コードの生成は RFC 6238 を別実装で行う） |
| `maint_changelog.py` | メンテナンス中の出口、リリースノートの通常版／詳細版 |

## 走らせ方

本番と同じビルドに対して実行する。`next dev` では挙動が違う（静的生成の
判定や、サーバー関数の同梱物が本番と異なる）ため、必ず `build` してから。

```bash
# 1. 空のデータベースを用意して、マイグレーションと初期データを入れる
createdb tsumiki_e2e
DATABASE_URL="postgresql://.../tsumiki_e2e" npx prisma migrate deploy
DATABASE_URL="postgresql://.../tsumiki_e2e" node scripts/seed.mjs

# 2. ビルドして起動
npm run build:next
DATABASE_URL="postgresql://.../tsumiki_e2e" npx next start -p 3000 &

# 3. 実行（全て通れば終了コード 0）
E2E_BASE=http://127.0.0.1:3000 python3 e2e/two_factor.py
```

環境変数:

- `E2E_BASE` — 対象の URL（既定 `http://127.0.0.1:3000`）
- `E2E_DB` — psql で覗くデータベース名（既定 `tsumiki_e2e`）
- `E2E_CHROMIUM` — Chromium の実行ファイル。Playwright が同梱の
  headless shell を持たない環境で指定する

## 書くときの注意

過去に何度も引っかかった点。

- **`role="alert"` の数を見て「結果が出た」と判断しない。**
  Next.js は読み上げ用に空の `role="alert"` を常に置いている。
  さらに `useActionState` は次の結果が返るまで前のエラー表示を残すので、
  存在ではなく「変わったこと」を見る。
- **`networkidle` を待たない。** 外部スクリプトの読み込みで返らないことがある。
  `domcontentloaded` で進め、見たい要素を明示的に待つ。
- **属性ではなくラベルで要素を探す。** `input[inputmode="numeric"]` は
  想定時給の欄とも一致した。`get_by_label` なら取り違えない。
- **ログイン済みのブラウザ窓を使い回さない。** `/login` が
  ダッシュボードへ飛ばされ、入力欄が無くなる。
