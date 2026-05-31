# Tsumiki（ツミキ）— 家計簿 + サブスク管理

> お金の全体像を、美しく積み上げる。

家計簿とサブスク管理をひとつにまとめた、日本語の家計アプリです。Apple のように洗練された UI と、
実用的で豊富な機能（コストタイム・サブスク・レビュー・ファミリー共有 ほか）を備えています。
絵文字は一切使わず、アイコンはすべてインライン SVG です。

## 主な機能

- **家計簿** — 収支の記録・カテゴリ分類・予算。iOS 風ハーフシートで最小手数の入力
- **サブスク管理** — 年額換算・合計コスト・更新リマインダー・更新日の自動記帳
- **コストタイム** — 支出を想定時給で「働いた時間」に換算（アクティビティリング）
- **サブスク・スタック** — 決済手段ごとにサブスクを多層カードで可視化（PLUS）
- **サブスク・レビュー** — 1件ずつ仕分けして固定費を見直す（PRO）
- **スマート解約アシスト** — 主要サービスの解約直リンク + 手順（PRO）
- **ファミリー共有** — 家族で1つの帳簿。誰が何にいくら払っているかを把握（PLUS=2人 / PRO=5人）
- **分析** — 収支推移・カテゴリ別内訳のグラフ、CSV エクスポート（PRO）
- **収益化** — 料金プラン / ペイウォール / 控えめな広告枠（Stripe・AdSense はキー差込みで有効化）
- **SEO** — SSR/SSG のマーケページ、メタデータ・sitemap・robots・JSON-LD
- **ダーク/ライト**・**PWA**・**端末別最適化**（モバイル下タブ + PC サイドバー）

## 技術スタック

Next.js 16 (App Router) / React 19 / TypeScript / Prisma (SQLite→PostgreSQL) /
独自セッション認証 / Tailwind CSS v4 + CSS 変数トークン / Recharts / Zod / Stripe / Vitest

## セットアップ

```bash
npm install
cp .env.example .env          # 実キーが無くても起動します
npx prisma migrate dev        # DB 作成・マイグレーション
npx prisma db seed            # デモデータ投入（demo@tsumiki.app / PRO）
npm run dev                   # http://localhost:3000
```

ログインはメールアドレスのみ（dev はパスワードレス）。デモを見るには `demo@tsumiki.app` でログインしてください。

## 主なスクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` / `build` / `start` | 開発 / ビルド / 本番起動 |
| `npm run typecheck` | 型チェック（`tsc --noEmit`） |
| `npm run lint` | ESLint |
| `npm run test` | Vitest（純ロジックの単体テスト） |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma 各種 |

## 収益化キーの設定（任意）

`.env` に以下を設定すると有効化されます（未設定でもアプリは完全動作）。

- **Stripe**: `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*`
- **AdSense**: `NEXT_PUBLIC_ADSENSE_CLIENT`（未設定時は広告枠に自社プラン訴求を表示）
- **メール (Resend)**: `RESEND_API_KEY`（更新リマインダー）
- **cron**: `CRON_SECRET` を設定し、`POST /api/cron/reminders` を定期実行

## アーキテクチャ

機能別モジュラーモノリス。`src/app` はルーティング/合成のみ、ロジックは `src/modules/*`、
共有は `src/lib`、UI 原子は `src/components/ui`。詳細は各モジュールの
`actions.ts` / `queries.ts` / `schema.ts` を参照してください。

## 本番 DB（PostgreSQL）への切替

`prisma/schema.prisma` の `datasource` を `postgresql` に変更し `DATABASE_URL` を差し替えるだけ。
列挙は String + Zod で実装しているため、SQLite/PostgreSQL 共通で動作します。
