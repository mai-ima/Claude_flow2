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

## リリースノート（指示を待たず必ず実施）
ユーザーから言われるまでもなく、変更を入れたら同じコミットで更新する。

- **記載先**: `scripts/release-notes.mjs` の `RELEASES` 先頭エントリ。`scripts/seed.mjs` がデプロイ時に `ReleaseNote` へ upsert し、`/changelog` はそれを読む（本文の出どころはこのファイル1つ）。
- **同時に揃える3ファイル**: `package.json` の `version`、`src/lib/seo.ts` の `APP_VERSION`、上記 changelog。3つがずれた状態でコミットしない。
- **番号の付け方** (`v1.2.3.4`):
  - 4桁目 = 小規模なバグ修正・不具合修正
  - 3桁目 = 中〜大規模。上げたら下位桁は 0 に戻す
  - 2桁目 = 3桁目が 9 に達したときの繰り上げ、またはユーザー指定の超大型アップデート
  - 1桁目 = 基本的に動かさない
  - 繰り上げ時は下位桁をすべて 0 にする（例: v1.2.3.9 → v1.2.4.0）
- **書かないもの**: デプロイ設定の修正、セキュリティ対応、内部リファクタなど利用者から見えない変更。これらでバージョンも上げない。
- **書き方**: 利用者向けの日本語。専門用語を使わず「何が直って、どう良くなるか」を書く。絵文字は使わない。

## 確認コマンド
`npm run typecheck` / `npm run lint` / `npm run test` / `npm run build`
