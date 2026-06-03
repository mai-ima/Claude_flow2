import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "リリースノート",
  description: "Tsumiki のアップデート履歴。新機能や改善をお知らせします。",
  path: "/changelog",
});

const RELEASES = [
  {
    version: "ベータ v1.2",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "UI・可視化の強化",
        items: [
          "予算を円グラフ（リング）で表示。使用率・残額・「1日あたり使える額」とペース判定をひと目で",
          "カテゴリ予算の配分をドーナツで俯瞰。使いすぎは色（注意/超過）で警告",
          "ダッシュボードに収支バランスバー・今月のカテゴリ別支出ドーナツ・予算リングを追加",
          "貯金目標に全体サマリー（合計・達成率）と達成ペース予測（あと何ヶ月・月いくら必要）を追加",
          "分析グラフに合計・凡例・前月比を併記して読みやすく",
        ],
      },
      {
        h: "改善・修正",
        items: [
          "初月（前月データなし）の前月比表示をわかりやすく",
          "積み立て入力の安全性を強化",
        ],
      },
    ],
  },
  {
    version: "ベータ v1.1",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "改善・修正",
        items: [
          "ログイン不具合（管理者列のスキーマ不整合）を修正",
          "デプロイの安定化（スキーマ同期・アカウント自動投入）",
          "重大/中/軽度の不具合の総点検と修正、既存機能の調整",
          "マーケティングサイトの機能紹介をアプリ実装に合わせて整合",
        ],
      },
    ],
  },
  {
    version: "ベータ v1.0",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "新機能",
        items: [
          "家計簿（収支記録・カテゴリ・検索/絞り込み/ページング・CSV 取込/書出・連続入力）",
          "サブスク管理（一覧 / 決済手段別スタック / 年間更新カレンダー・年額換算・更新リマインダー・自動記帳・無駄検出）",
          "予算管理・貯金目標・分析（前月比）",
          "コストタイム（支出を働いた時間に換算）",
          "ファミリー共有・コマンドパレット（⌘K）・アプリ内通知・管理コンソール",
        ],
      },
      {
        h: "デザイン・操作感",
        items: [
          "Apple ライクな UI（iOS インセットリスト・大型タイトル・ピル型ボタン・ハーフシート入力・スクロール演出）",
          "ダーク/ライト・PWA・端末別最適化・ページ遷移アニメーション",
        ],
      },
      {
        h: "基盤・運用",
        items: [
          "PostgreSQL + Prisma（マイグレーション管理）・CI・パスワード認証・セキュリティヘッダ",
          "メール(Resend)・レート制限(Upstash)・監視(Sentry)を env 差込みで対応",
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">リリースノート</h1>
      <p className="mt-4 text-[17px] text-text-secondary">
        新機能や改善のお知らせ。よりよい家計体験へ、こつこつ積み上げます。
      </p>

      <div className="mt-12 space-y-6">
        {RELEASES.map((r) => (
          <Card key={r.version} className="p-7">
            <div className="flex items-center gap-3">
              <h2 className="text-[22px] font-bold tracking-tight">{r.version}</h2>
              <Badge tone="accent" size="md">
                {r.tag}
              </Badge>
              <span className="ml-auto text-[13px] text-text-tertiary">{r.date}</span>
            </div>
            <div className="mt-5 space-y-5">
              {r.sections.map((s) => (
                <div key={s.h}>
                  <h3 className="text-[14px] font-semibold text-text-secondary">{s.h}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {s.items.map((it) => (
                      <li key={it} className="flex gap-2 text-[14px] leading-relaxed text-text-secondary">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
