import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allReleases } from "@/modules/releases/queries";
import { BroadcastForm } from "@/modules/admin/components/broadcast-form";
import { BannerManager } from "@/modules/admin/components/banner-manager";
import { pageMetadata } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = pageMetadata({ title: "コンテンツ運用", noindex: true });

export default async function AdminContentPage() {
  await requireAdmin();

  const [releases, banners, all, free, plus, pro] = await Promise.all([
    allReleases(),
    db.announcementBanner.findMany({ orderBy: { startsAt: "desc" }, take: 20 }),
    db.user.count({ where: { suspendedAt: null } }),
    db.user.count({ where: { suspendedAt: null, billing: { tier: "FREE" } } }),
    db.user.count({ where: { suspendedAt: null, billing: { tier: "PLUS" } } }),
    db.user.count({ where: { suspendedAt: null, billing: { tier: "PRO" } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">コンテンツ運用</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          お知らせの配信・告知バナー・リリースノートを管理します。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">お知らせを送る</h2>
        <BroadcastForm counts={{ ALL: all, FREE: free, PLUS: plus, PRO: pro }} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">告知バナー</h2>
        <p className="text-[13px] text-text-secondary">
          アプリの上部に出す帯です。期間を指定でき、利用者は閉じられます。
        </p>
        <BannerManager
          banners={banners.map((b) => ({
            id: b.id,
            message: b.message,
            href: b.href,
            tone: b.tone as "INFO" | "WARNING" | "CRITICAL",
            startsAt: b.startsAt.toISOString().slice(0, 16),
            endsAt: b.endsAt.toISOString().slice(0, 16),
          }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">リリースノート</h2>
        <p className="text-[13px] text-text-secondary">
          /changelog に出る内容です。公開するとおよそ5分で反映されます。
        </p>
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {releases.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-baseline gap-2 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0"
            >
              <span className="font-medium">{r.title}</span>
              {r.published ? (
                <Badge tone="income" size="sm">
                  公開中
                </Badge>
              ) : (
                <Badge size="sm">下書き</Badge>
              )}
              <span className="text-text-tertiary">{r.date}</span>
              <span className="ml-auto text-text-tertiary">
                {r.sections.length}セクション ・{" "}
                {r.sections.reduce((a, s) => a + s.items.length, 0)}項目
              </span>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-text-tertiary">
          現在の運用では、リリースノートは変更と同じコミットで更新しています（CLAUDE.md の規約）。
          この一覧は反映状況の確認用です。
        </p>
      </section>
    </div>
  );
}
