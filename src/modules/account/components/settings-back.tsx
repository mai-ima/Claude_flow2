import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

/**
 * 設定の下位ページから戻る導線。
 *
 * スマホには「戻る」がある端末とない端末があり、PC のサイドバーからは
 * /settings に入り直すしかない。画面の中に必ず出口を置いておく。
 */
export function SettingsBack() {
  return (
    <Link
      href="/settings"
      className="mb-4 inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-accent"
    >
      <ChevronRightIcon size={16} className="rotate-180" />
      設定へ戻る
    </Link>
  );
}
