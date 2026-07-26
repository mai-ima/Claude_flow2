"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * グラフの遅延読み込み。
 *
 * recharts は大きく、ダッシュボード・予算・分析の3画面から読み込まれるため、
 * 静的 import だと最初の表示に必要ないコードまで一緒に落ちてくる。
 * 実際に描画する場所でだけ取りに行く。
 * グラフは DOM 計測が要るのでサーバー描画はしない（ssr: false）。
 */
const ChartFallback = () => <Skeleton className="h-[240px] w-full rounded-2xl" />;

export const CategoryDonut = dynamic(
  () => import("./charts").then((m) => m.CategoryDonut),
  { ssr: false, loading: ChartFallback },
);

export const TrendAreaChart = dynamic(
  () => import("./charts").then((m) => m.TrendAreaChart),
  { ssr: false, loading: ChartFallback },
);

export const MonthlyBarChart = dynamic(
  () => import("./charts").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: ChartFallback },
);

export const RateLineChart = dynamic(
  () => import("./charts").then((m) => m.RateLineChart),
  { ssr: false, loading: ChartFallback },
);
