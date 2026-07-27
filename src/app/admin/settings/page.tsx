import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadSettings } from "@/lib/settings";
import { FlagManager } from "@/modules/admin/components/flag-manager";
import { SystemSettingsForm } from "@/modules/admin/components/system-settings-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "設定", noindex: true });

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [flags, settings] = await Promise.all([
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
    loadSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">設定</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          機能の段階公開と、コードに直書きしていた定数の変更です。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">システム設定</h2>
        <SystemSettingsForm settings={settings} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">機能フラグ</h2>
        <FlagManager
          flags={flags.map((f) => ({
            key: f.key,
            label: f.label,
            description: f.description,
            enabled: f.enabled,
            rolloutPct: f.rolloutPct,
            tiers: Array.isArray(f.tiers)
              ? f.tiers.filter((t): t is string => typeof t === "string")
              : null,
          }))}
        />
      </section>
    </div>
  );
}
