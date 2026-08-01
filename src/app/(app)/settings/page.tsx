import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup, ListRow } from "@/components/ui/list";
import {
  ShieldIcon,
  GearIcon,
  WalletIcon,
  SlidersIcon,
  UsersIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SkinPicker } from "@/components/theme/skin-picker";
import { ProfileForm } from "@/modules/account";
import { BillingCard } from "@/modules/billing";
import { isStripeEnabled } from "@/lib/env";
import { SITE, APP_VERSION, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "設定", noindex: true });

/**
 * 設定のトップ。
 *
 * 以前は1画面に13個の節が縦に並んでいて、目的の項目までひたすら
 * スクロールする必要があった。よく触るもの（名前・見た目・プラン）だけを
 * ここに残し、残りは中身ごとに分けて目次から入る形にする。
 *
 * URL の /settings はそのまま残す。通知やメールからのリンクが多く、
 * 変えると過去に送ったお知らせのリンクが行き止まりになる。
 */
export default async function SettingsPage() {
  const ctx = await getAppContext();

  return (
    <PageContainer>
      <PageHeader title="設定" />

      <div className="space-y-6">
        <ListGroup title="プロフィール" padded>
          <ProfileForm name={ctx.user.name ?? ""} wage={ctx.user.assumedHourlyWage} />
        </ListGroup>

        <ListGroup title="外観" padded>
          {/*
            テーマもスキンも見本カードが縦に積まれる。ラベルを横に置くと、
            狭い画面ではラベルだけが左上に取り残されて宙に浮く（実機で確認）。
            どちらもラベルを上、選択肢を下に揃える。
          */}
          <div className="space-y-4">
            <div>
              <div className="mb-2.5 text-[14px] text-text-secondary">テーマ</div>
              <ThemeToggle />
            </div>
            <div className="border-t border-border-subtle pt-4">
              <div className="mb-2.5 text-[14px] text-text-secondary">スキン</div>
              <SkinPicker />
            </div>
          </div>
        </ListGroup>

        <ListGroup title="プラン" padded>
          <BillingCard tier={ctx.tier} stripeEnabled={isStripeEnabled} />
        </ListGroup>

        <ListGroup title="くわしい設定">
          <ListRow
            href="/settings/ledger"
            icon={<WalletIcon size={18} />}
            iconBg="bg-accent-solid"
            label="帳簿の中身"
            sublabel="カテゴリ・タグ・支払い方法・帳簿の名前"
          />
          <ListRow
            href="/settings/sharing"
            icon={<UsersIcon size={18} />}
            iconBg="bg-pod"
            label="ファミリー共有"
            sublabel="メンバーの招待と権限"
          />
          <ListRow
            href="/settings/security"
            icon={<ShieldIcon size={18} />}
            iconBg="bg-income"
            label="ログインと安全性"
            sublabel="パスワード・二要素認証・端末"
          />
          <ListRow
            href="/settings/advanced"
            icon={<SlidersIcon size={18} />}
            iconBg="bg-surface-3"
            label="データとその他"
            sublabel="書き出し・ベータ機能・退会"
          />
        </ListGroup>

        {ctx.user.isAdmin && (
          <ListGroup title="管理者">
            <ListRow
              href="/admin"
              icon={<GearIcon size={18} />}
              iconBg="bg-pod"
              label="管理コンソール"
              sublabel="アプリ全体の監視・管理"
            />
          </ListGroup>
        )}

        <p className="pt-2 text-center text-[12px] text-text-tertiary">
          {SITE.name} ・ ベータ v{APP_VERSION}
        </p>
      </div>
    </PageContainer>
  );
}
