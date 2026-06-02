import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { BellIcon, ShieldIcon, SparklesIcon } from "@/components/icons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "お問い合わせ",
  description: "Tsumiki へのお問い合わせ・ご要望・不具合報告はこちら。",
  path: "/contact",
});

const CHANNELS = [
  { icon: BellIcon, title: "サポート", body: "使い方や不具合のご相談", value: "support@tsumiki.app" },
  { icon: SparklesIcon, title: "ご要望・ご意見", body: "あったらいいな、を教えてください", value: "feedback@tsumiki.app" },
  { icon: ShieldIcon, title: "プライバシー", body: "データの取り扱いについて", value: "privacy@tsumiki.app" },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">お問い合わせ</h1>
      <p className="mt-4 text-[17px] text-text-secondary">
        ご質問・ご要望・不具合のご報告をお待ちしています。
      </p>

      <div className="mt-10 space-y-3">
        {CHANNELS.map((c) => (
          <Card key={c.title} className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <c.icon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{c.title}</div>
              <div className="text-[13px] text-text-tertiary">{c.body}</div>
            </div>
            <a href={`mailto:${c.value}`} className="text-[14px] font-medium text-accent">
              {c.value}
            </a>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-surface-1 p-6 text-center">
        <p className="text-[15px] text-text-secondary">先によくある質問もご確認ください。</p>
        <ButtonLink href="/help" variant="gray" className="mt-3">
          ヘルプセンター
        </ButtonLink>
      </div>

      <p className="mt-8 text-center text-[13px] text-text-tertiary">
        <Link href="/" className="hover:text-text-secondary">← トップにもどる</Link>
      </p>
    </div>
  );
}
