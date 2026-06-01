import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  ClockIcon,
  CardIcon,
  SparklesIcon,
  UsersIcon,
  RepeatIcon,
  BellIcon,
  ChartIcon,
  ShieldIcon,
} from "@/components/icons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "機能",
  description:
    "コストタイム、サブスク・スタック、サブスク・レビュー、スマート解約アシスト、ファミリー共有。Tsumiki のすべての機能を紹介します。",
  path: "/features",
});

const SECTIONS = [
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
    body: "決済手段ごとにサブスクを多層のガラスカードで整理。眠ったカードに眠ったままのサブスクが、ひと目で見つかります。",
    tier: "PLUS",
  },
  {
    icon: SparklesIcon,
    tag: "サブスク・レビュー",
    title: "1件ずつ、心地よく仕分け。",
    body: "登録中のサブスクを大きなカードで1つずつ提示。「必要」か「見直す」かをスワイプで選ぶだけ。最後に年間の節約候補額をお知らせします。",
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
  { icon: RepeatIcon, title: "自動記帳", body: "更新日が来たら、サブスクの支出を自動で家計簿へ。" },
  { icon: BellIcon, title: "更新リマインダー", body: "請求の数日前に、静かにお知らせ。" },
  { icon: ChartIcon, title: "分析・レポート", body: "収支の推移やカテゴリ内訳を、美しいグラフで。" },
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
          <Card key={s.tag} className="grid items-center gap-8 p-8 sm:p-12 md:grid-cols-2">
            <div className={i % 2 === 1 ? "md:order-2" : ""}>
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
            <div className={i % 2 === 1 ? "md:order-1" : ""}>
              <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-gradient-to-br from-accent/10 to-pod/10">
                <s.icon size={72} className="text-accent" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {MORE.map((m) => (
          <Card key={m.title} className="p-6">
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
