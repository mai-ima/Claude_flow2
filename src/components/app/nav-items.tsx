import {
  HomeIcon,
  WalletIcon,
  RepeatIcon,
  ChartIcon,
  GearIcon,
  type IconProps,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: (p: IconProps) => React.ReactElement;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: HomeIcon },
  { href: "/transactions", label: "家計簿", icon: WalletIcon },
  { href: "/subscriptions", label: "サブスク", icon: RepeatIcon },
  { href: "/reports", label: "分析", icon: ChartIcon },
  { href: "/settings", label: "設定", icon: GearIcon },
];
