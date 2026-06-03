import { cn } from "@/lib/cn";

/** ローディング中のプレースホルダ。reduced-motion 時はパルス停止（globals.css）。 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} aria-hidden />;
}
