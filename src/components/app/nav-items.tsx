import {
  HomeIcon,
  WalletIcon,
  RepeatIcon,
  TargetIcon,
  FlagIcon,
  ChartIcon,
  GearIcon,
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

/** スマホ下タブ用（よく使う5つに厳選） */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: HomeIcon },
  { href: "/transactions", label: "家計簿", icon: WalletIcon },
  { href: "/subscriptions", label: "サブスク", icon: RepeatIcon },
  { href: "/reports", label: "分析", icon: ChartIcon },
  { href: "/settings", label: "設定", icon: GearIcon },
];
