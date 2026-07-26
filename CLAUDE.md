@AGENTS.md

# Tsumiki — プロジェクト規約

家計簿 + サブスク管理アプリ。Next.js 16 (App Router) / React 19 / TypeScript / Prisma。

## 設計の原則
- **機能別モジュラーモノリス**: `src/app` はルーティング/合成のみ。ロジックは `src/modules/<feature>/`（`actions.ts` / `queries.ts` / `schema.ts` / `components/`）。共有は `src/lib`、UI 原子は `src/components/ui`。
- **公開 API は `index.ts`（barrel）**: 型・schema・actions・components を再 export。`queries.ts` 等 `server-only` は barrel に含めず、サーバー側から直接 import（client が server-only を巻き込まない）。
- **モジュール相互 import 禁止**: 横断連携は `src/lib/orchestrator.ts` に集約。
- **Server Action は必ず `src/lib/safe-action.ts` の `authedAction` で包む**（認証 + Zod 検証 + 例外捕捉を一元化、`{ ok, data | fieldErrors }` を返す）。
- **データ層で認可**: 全ドメインクエリは `ledgerId` でスコープし、`requireLedgerMember` で権限検証。
- **金額は最小単位の整数**（JPY=円）。整形は `src/lib/money.ts`。
- **列挙は String 列 + `src/lib/enums.ts` の Zod/TS union**（Prisma enum を使わず DB 非依存に保つ。接続先は PostgreSQL）。

## 厳守事項
- **絵文字禁止**。アイコンは `src/components/icons` のインライン SVG のみ。
- **収益化キーは任意**: Stripe/AdSense/Resend は env が無くても完全動作（no-op / 自社訴求）。`src/lib/env.ts` のフラグで分岐。
- **クライアントから純関数を呼ぶ場合は `"use client"` ファイルに置かない**（例: 色は `src/lib/colors.ts`）。サーバーから呼べなくなる。
- 生成物 `src/generated/**` は編集しない（lint 対象外）。

## 確認コマンド
`npm run typecheck` / `npm run lint` / `npm run test` / `npm run build`
