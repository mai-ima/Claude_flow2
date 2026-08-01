import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { FeatureMock, type FeatureTag } from "@/components/marketing/feature-mocks";
import {
  ClockIcon,
  CardIcon,
  SparklesIcon,
  UsersIcon,
  RepeatIcon,
  BellIcon,
  ChartIcon,
  ShieldIcon,
  TargetIcon,
  SlidersIcon,
  ArrowUpIcon,
  WalletIcon,
  CalendarIcon,
} from "@/components/icons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "機能",
  description:
    "繰り返し取引・自動記帳、コストタイム、サブスクの値上げ検知・体験終了通知、予算アラートと自動積立、サブスク・レビュー、ファミリー共有。Tsumiki のすべての機能を紹介します。",
  path: "/features",
});

/**
 * 各節と、その横に出す図。tag は図の一覧のキーでもあるので、
 * 節を足したときに図を用意し忘れると型で止まる。
 */
const SECTIONS: {
  icon: typeof CalendarIcon;
  tag: FeatureTag;
  title: string;
  body: string;
  tier?: string;
}[] = [
  {
    icon: CalendarIcon,
    tag: "カレンダー表示",
    title: "1ヶ月のお金を、カレンダーで。",
    body: "収支をカレンダーの形で一覧。どの日にいくら使ったかが、めくるだけでひと目でわかります。日付をタップすればその日の明細が開き、そのまま その日づけで記録も追加できます。",
  },
  {
    icon: ChartIcon,
    tag: "8つの切り口の分析",
    title: "同じ数字を、8通りの角度から。",
    body: "支出・収入・収支・年間支出・年間収入・貯蓄・貯蓄率・予算。タブを切り替えるだけで、円グラフ・棒グラフ・推移グラフが目的に合わせて表示されます。",
  },
  {
    icon: RepeatIcon,
    tag: "自動化・繰り返し",
    title: "決まった出入りは、自動で。",
    body: "家賃やサブスクの引き落としを「定期取引」に登録すれば、毎月・毎週など自動で家計簿に記録。貯金も毎月の自動積立でコツコツ積み上がります。記録の手間を、限りなくゼロへ。",
  },
  {
    icon: ClockIcon,
    tag: "コストタイム",
    title: "支出を「時間」で考える。",
    body: "想定時給を設定すると、すべての支出があなたの労働時間に換算されます。月980円のサブスクは、人生の30分。お金の重みを、直感的に。",
  },
  {
    icon: CardIcon,
    tag: "サブスク・スタック",
    title: "どのカードから、何が引き落とされる？",
    body: "決済手段ごとにサブスクをカードで束ねて整理。眠ったカードに眠ったままのサブスクが、ひと目で見つかります。",
    tier: "PLUS",
  },
  {
    icon: SparklesIcon,
    tag: "サブスク・レビュー",
    title: "1件ずつ、心地よく仕分け。",
    body: "登録中のサブスクを大きなカードで1つずつ提示。「必要」か「見直す」かをワンタップで選ぶだけ。最後に年間の節約候補額をお知らせします。",
    tier: "PRO",
  },
  {
    icon: UsersIcon,
    tag: "ファミリー共有",
    title: "家族のサブスク、まるごと把握。",
    body: "家族で1つの共有帳簿を持ち、誰が・何に・いくら払っているかを一覧で。重複契約や負担の偏りに、すぐ気づけます。",
    tier: "PLUS",
  },
];

const MORE = [
  { icon: RepeatIcon, title: "自動記帳", body: "更新日が来たら、サブスクの支出を自動で家計簿へ。取りこぼした分もまとめて記録。" },
  { icon: SlidersIcon, title: "一括編集", body: "複数の取引をまとめて選択し、カテゴリ・支払い方法の変更や削除をワンアクションで。" },
  { icon: ArrowUpIcon, title: "値上げ検知", body: "サブスクの金額が変わると価格改定を自動で記録。値上げは一覧でひと目でわかります。" },
  { icon: ClockIcon, title: "体験終了アラート", body: "無料体験（トライアル）の終了が近づくと通知。解約忘れによる課金を防ぎます。" },
  { icon: BellIcon, title: "更新リマインダー", body: "更新の当日〜30日前まで、サブスクごとに通知タイミングを設定。アプリ内とメールで静かにお知らせ。" },
  { icon: WalletIcon, title: "予算アラート", body: "カテゴリや全体の予算が80%・100%に達したら通知。使いすぎを早めに防ぎます。" },
  { icon: TargetIcon, title: "予算・貯金目標", body: "予算は円グラフ＋過去平均からの提案。目標は毎月の自動積立と積立履歴・引き出しに対応。" },
  { icon: CalendarIcon, title: "カレンダー / リスト", body: "同じ家計簿を、カレンダーと一覧のどちらでも。用途に合わせてワンタップで切り替え。" },
  { icon: ChartIcon, title: "分析・レポート", body: "支出・収入・収支・年間・貯蓄・貯蓄率・予算の8タブ。合計や前月比つきの美しいグラフで。" },
  { icon: SparklesIcon, title: "スマート解約アシスト", body: "主要40以上のサービスに対応。解約ページへ最短でジャンプし、手順もその場で確認。" },
  { icon: ShieldIcon, title: "プライバシー", body: "データはあなたのもの。広告のために売りません。" },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">
          家計のための、すべての道具。
        </h1>
        <p className="mt-4 text-[18px] text-text-secondary">
          毎日の記録から、固定費の最適化まで。Tsumiki ならひとつで完結します。
        </p>
      </div>

      <div className="mt-16 space-y-6">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.tag}>
          <Card className="grid items-center gap-8 p-8 sm:p-12 md:grid-cols-2 hover-lift">
            {/* min-w-0 が要る。付けないと、中の図（タブの横並びなど）の
                内容幅がそのまま桁の幅になり、狭い画面で横に飛び出す。 */}
            <div className={`min-w-0 ${i % 2 === 1 ? "md:order-2" : ""}`}>
              <div className="flex items-center gap-2">
                <Badge tone="accent" size="md">
                  {s.tag}
                </Badge>
                {s.tier && (
                  <Badge tone={s.tier === "PRO" ? "pod" : "neutral"} size="md">
                    {s.tier}
                  </Badge>
                )}
              </div>
              <h2 className="mt-4 text-[28px] font-bold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-text-secondary">{s.body}</p>
            </div>
            <div className={`min-w-0 ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <FeatureMock tag={s.tag} />
            </div>
          </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {MORE.map((m) => (
          <Card key={m.title} className="p-6 hover-lift">
            <m.icon size={26} className="text-accent" />
            <h3 className="mt-3 text-[16px] font-semibold">{m.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{m.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-20 text-center">
        <ButtonLink href="/signup" size="lg">
          無料で始める
        </ButtonLink>
      </div>
    </div>
  );
}
