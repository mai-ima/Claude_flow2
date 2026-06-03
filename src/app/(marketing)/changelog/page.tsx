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
    version: "ベータ v1.2.2.5",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "不具合の修正",
        items: [
          "PC のサイドバーがスクロールで一緒に流れてしまう不具合を修正（常に表示されるよう固定）",
          "スマホのメニュー（サイドバー）が下のタブバーやボタンに隠れてしまう不具合を修正",
          "貯金目標を編集すると期日が初期値に戻ってしまう不具合を修正",
          "削除・積み立ての失敗時にエラーが表示されない問題を修正",
          "表記の誤りを修正",
        ],
      },
    ],
  },
  {
    version: "ベータ v1.2.2.1",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "スマホ最適化・UI調整",
        items: [
          "iPhone / Android 向けに最適化（入力時のズーム防止・タップ反応の改善・セーフエリア対応）",
          "リングやカードが狭い画面でも崩れないようレイアウトを調整",
          "タップ領域を拡大し、操作しやすく",
        ],
      },
      {
        h: "機能の追加・改善",
        items: [
          "設定に「すべての記録を削除」を追加（確認モーダルつき）",
          "お問い合わせをフォームから直接送信できるように",
        ],
      },
    ],
  },
  {
    version: "ベータ v1.2.2",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "サイト・コンテンツ",
        items: [
          "会社情報ページ（/about）とよくある質問ページ（/faq）を新設",
          "セキュリティ・Cookie ポリシーのページを追加",
          "プライバシーポリシー・利用規約・特定商取引法に基づく表記を本格的な内容に刷新",
          "フッター・ナビゲーションを再編し、各ページへの導線を整理",
        ],
      },
    ],
  },
  {
    version: "ベータ v1.2.1",
    date: "2026年6月",
    tag: "Beta",
    sections: [
      {
        h: "リングの刷新",
        items: [
          "進捗の円を Apple フィットネス風に刷新（色付きトラック・艶のあるグラデーション・100%超で先端が重なる表現）",
          "ダッシュボードに3重リングの「今月のアクティビティ」（支出・貯蓄・サブスク）を追加",
        ],
      },
      {
        h: "設定の追加",
        items: [
          "表示通貨を選べるように（円・ドル・ユーロ・ポンド・ウォン・元）",
          "帳簿の名前を設定から変更できるように",
        ],
      },
      {
        h: "修正・最適化",
        items: [
          "アカウント削除の処理を堅牢化（認証・例外処理を統一）",
          "更新リマインダー通知の生成を一括化し、DB アクセスを削減",
          "取引一覧の取得を必要な項目に限定し、表示を高速化",
        ],
      },
    ],
  },
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
