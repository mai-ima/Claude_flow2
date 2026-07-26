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

Next.js 16 (App Router) / React 19 / TypeScript / Prisma + PostgreSQL /
独自セッション認証 / Tailwind CSS v4 + CSS 変数トークン / Recharts / Zod / Stripe / Vitest

## セットアップ（ローカル開発）

PostgreSQL が必要です（無料の [Neon](https://neon.tech) などの接続URLを `DATABASE_URL` に設定）。

```bash
npm install
cp .env.example .env          # DATABASE_URL を PostgreSQL の接続URLに設定
npx prisma migrate deploy     # マイグレーションを適用（新規 DB）
npx prisma db seed            # （任意）デモデータ投入（demo@tsumiki.app / PRO）
npm run dev                   # http://localhost:3000
```

スキーマ変更時は `npm run db:migrate`（`prisma migrate dev`）で新しいマイグレーションを作成します。

ログインはメールアドレス + パスワード（8文字以上）。

## ネット公開（Vercel — ブラウザだけで完結）

1. [vercel.com](https://vercel.com) に GitHub でサインイン
2. 「Add New… → Project」で本リポジトリを Import（本番ブランチに `claude/budget-subscription-app-ZVkJO` を指定）
3. プロジェクトの **Storage → Create Database → Postgres** を追加（`DATABASE_URL` が自動で設定されます）
4. Settings → Environment Variables に `NEXT_PUBLIC_APP_URL`（公開URL）を追加し、**Redeploy**
5. 発行された URL を iPhone / Windows のブラウザで開く

ビルド時に `vercel-build`（`prisma generate && prisma migrate deploy && next build`）が走り、マイグレーションが自動適用されます。
Stripe/AdSense/Resend/Upstash/Sentry のキーは未設定でも完全動作します（必要になったら環境変数に追加）。

> **既存DBからの移行（重要）**: 以前 `db push` で作成した DB を使い続ける場合、マイグレーション履歴が無いため初回の `migrate deploy` が失敗します。次のいずれかを一度だけ実施してください。
> - 新しい DB を作り直す（デモデータは `/api/seed-demo` で再投入）。
> - または既存 DB に対して `npx prisma migrate resolve --applied 20260602090930_init` を実行してベースライン化。

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

## データベースについて

PostgreSQL を使用します（`DATABASE_URL` で接続）。列挙は String + Zod で実装しているため
DB に依存せず、別の DB への移行も容易です。スキーマ変更は `prisma db push`（または `migrate`）で反映します。
