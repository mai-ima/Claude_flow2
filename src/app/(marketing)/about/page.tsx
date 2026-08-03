import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { ShieldIcon, SparklesIcon, ChartIcon, ClockIcon } from "@/components/icons";
import { pageMetadata, SITE, CONTACT } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tsumiki について",
  description:
    "Tsumiki（ツミキ）が大切にしていること。お金の全体像を、美しく積み上げる。プライバシー第一の家計簿 + サブスク管理アプリの考え方をご紹介します。",
  path: "/about",
});

const VALUES = [
  {
    icon: ShieldIcon,
    title: "プライバシー第一",
    body: "あなたの家計データは、あなたのもの。広告のために売ることはありません。収益化は控えめに、機能で価値を返します。",
  },
  {
    icon: SparklesIcon,
    title: "美しく、分かりやすく",
    body: "数字の羅列ではなく、ひと目で伝わる形に。円形のグラフや推移のグラフで、お金の流れを直感的に。",
  },
  {
    icon: ChartIcon,
    title: "ひとつに、まとめる",
    body: "家計簿とサブスク管理を別々に持つ必要はありません。収支も固定費も、ひとつの場所で。",
  },
  {
    icon: ClockIcon,
    title: "お金を、時間で考える",
    body: "支出は「働いた時間」でもあります。コストタイムで、お金の重みを実感に変えます。",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="accent" size="md">
          {SITE.name} について
        </Badge>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">
          お金の全体像を、美しく積み上げる。
        </h1>
        <p className="mt-4 text-[18px] leading-relaxed text-text-secondary">
          {SITE.name}（ツミキ）は、家計簿とサブスク管理をひとつにまとめた家計アプリです。繰り返し取引や自動積立などの自動化で続けやすく、日々の記録から固定費の見直しまで、驚くほどなめらかで上質な体験で、お金との付き合い方を少しだけ気持ちよくします。
        </p>
      </div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2">
        {VALUES.map((v) => (
          <Reveal key={v.title}>
            <Card className="h-full p-7 hover-lift">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                <v.icon size={24} />
              </div>
              <h2 className="mt-4 text-[18px] font-bold tracking-tight">{v.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{v.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <Card className="mt-10 p-8 sm:p-10">
          <h2 className="text-[22px] font-bold tracking-tight">ベータ版として、育てています</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            {SITE.name} は現在ベータ版です。実際にお使いくださる方の声をうかがいながら、機能とデザインを少しずつ磨いています。ご要望やお気づきの点がございましたら、
            <a href={`mailto:${CONTACT.feedback}`} className="text-accent underline">
              {CONTACT.feedback}
            </a>
            までお寄せください。一つひとつ、丁寧に積み上げていきます。
          </p>
        </Card>
      </Reveal>

      <div className="mt-16 text-center">
        <ButtonLink href="/signup" size="lg">
          無料で始める
        </ButtonLink>
        <p className="mt-4 text-[13px] text-text-tertiary">
          機能の詳細は
          <a href="/features" className="text-accent underline">
            機能紹介
          </a>
          、料金は
          <a href="/pricing" className="text-accent underline">
            料金プラン
          </a>
          をご覧ください。
        </p>
      </div>
    </div>
  );
}
