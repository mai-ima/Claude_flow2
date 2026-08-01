# データベース越しの確認

ブラウザを通さず、実際のデータベースに対して直接確かめるもの。
画面からは再現しにくいこと（同時に押されたとき、退会したあと、
数か月ぶんの積み上がり）を見るために置いている。

いずれも一度は本物の不具合を見つけたか、直した不具合が戻っていないことを
守るためのもの。名前は `check-*.mjs` に揃えている。

| ファイル | 見ているもの |
| --- | --- |
| `check-admin-audit.mjs` | 管理操作の証跡。対象を消しても記録が残ること |
| `check-budget-carryover.mjs` | 予算の繰り越し。使わなかった分の持ち越し |
| `check-category-tree.mjs` | カテゴリのまとめ。親を消しても子と記録が残ること |
| `check-concurrency.mjs` | 同時に積み立てたときに金額が消えないこと |
| `check-feedback.mjs` | ご意見の保存・返信・退会後も残ること |
| `check-invites.mjs` | 招待の期限・取り消し・宛先の一致 |
| `check-ledger-ops.mjs` | 帳簿のオーナー変更・退出・削除 |
| `check-log-purge.mjs` | ログの削除。消しすぎないこと |
| `check-member-departure.mjs` | メンバーが抜けても記録が残ること |
| `check-member-roles.mjs` | 権限ごとにできることの境目 |
| `check-notifications.mjs` | 5種類の通知が実データから作られること（要サーバー） |
| `check-reset-and-notify.mjs` | 初期状態に戻す・お知らせの削除 |
| `check-saved-search.mjs` | 保存した検索。他人のものに触れないこと |
| `check-settlement.mjs` | 精算の割り勘と、渡す額の求め方 |
| `check-subscription-insights.mjs` | 価格改定と見直しの判定 |
| `check-tags-assets.mjs` | タグと資産。帳簿をまたがないこと |
| `check-webhook-idempotency.mjs` | 決済の通知が二重に届いても壊れないこと（要サーバー） |

## 走らせ方

ほとんどは、データベースさえあれば単体で動く。

```bash
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tsumiki" node scripts/check-settlement.mjs
```

全部まとめて:

```bash
for f in scripts/check-*.mjs; do
  echo "== $f"
  DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tsumiki" node "$f" | tail -2
done
```

### サーバーが要るもの

2つだけは、動いているアプリに向けて HTTP を投げる。専用の環境変数を
渡して起動する必要があるので、他とは別に立ち上げる。

```bash
# 通知（自動処理を叩いて、通知が作られることを見る）
CRON_SECRET=test-cron-secret \
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tsumiki" \
  npx next start -p 3120 &
BASE=http://127.0.0.1:3120 CRON_SECRET=test-cron-secret \
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tsumiki" \
  node scripts/check-notifications.mjs

# 決済の通知（署名を自前で作って投げる）
STRIPE_WEBHOOK_SECRET=whsec_test STRIPE_SECRET_KEY=sk_test_dummy \
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tsumiki" \
  npx next start -p 3127 &
STRIPE_WEBHOOK_SECRET=whsec_test \
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tsumiki" \
  node scripts/check-webhook-idempotency.mjs
```

## 書くときの注意

- **後片付けまで書く。** 作ったものを消して終わる。残すと次の実行で
  「前回の残りがある前提」になり、一度は通っても二度目に落ちる。
  実際、精算の確認がこれで落ちた。
- **接続先は `DATABASE_URL` を見る。** 決め打ちにすると、環境が変わった
  ときに動かず、動かないことに気づかないまま「検証したつもり」になる。
- **消えないことも確かめる。** 「消せること」より「消しすぎないこと」の
  ほうが、壊れたときの被害が大きい。
