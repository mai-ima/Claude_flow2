import {
  HomeIcon,
  WalletIcon,
  RepeatIcon,
  TargetIcon,
  FlagIcon,
  ChartIcon,
  GearIcon,
  SwapIcon,
  type IconProps,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: (p: IconProps) => React.ReactElement;
}

/** 全ナビ項目（PC サイドバー・スマホのドロワー用） */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: HomeIcon },
  { href: "/transactions", label: "家計簿", icon: WalletIcon },
  { href: "/subscriptions", label: "サブスク", icon: RepeatIcon },
  { href: "/budgets", label: "予算", icon: TargetIcon },
  { href: "/goals", label: "目標", icon: FlagIcon },
  { href: "/reports", label: "分析", icon: ChartIcon },
  { href: "/settings", label: "設定", icon: GearIcon },
];

/** 共有帳簿でだけ意味を持つ項目。1人の帳簿には出さない。 */
export const POD_NAV_ITEM: NavItem = {
  href: "/settlement",
  label: "精算",
  icon: SwapIcon,
};

/**
 * 表示するナビ項目。
 * 精算は共有帳簿のときだけ出す。個人の家計簿に出しても、開いた先に
 * 「メンバーが2人以上の帳簿で使えます」としか書けない。
 */
export function navItemsFor(isPod: boolean): NavItem[] {
  if (!isPod) return NAV_ITEMS;
  // 設定は末尾に置いたままにする（位置が動くと押し間違える）。
  return [...NAV_ITEMS.slice(0, -1), POD_NAV_ITEM, NAV_ITEMS[NAV_ITEMS.length - 1]];
}

/** スマホ下タブ用（よく使う5つに厳選） */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: HomeIcon },
  { href: "/transactions", label: "家計簿", icon: WalletIcon },
  { href: "/subscriptions", label: "サブスク", icon: RepeatIcon },
  { href: "/reports", label: "分析", icon: ChartIcon },
  { href: "/settings", label: "設定", icon: GearIcon },
];
