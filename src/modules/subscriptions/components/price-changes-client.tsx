"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";

export interface PriceChangeView {
  id: string;
  subscriptionId: string;
  name: string;
  statusLabel: string;
  active: boolean;
  dateLabel: string;
  oldAmount: number;
  newAmount: number;
  diff: number;
  /** 変化率（%）。元が0円なら null。 */
  percent: number | null;
  /** この改定が年額に与える影響。 */
  yearlyDiff: number;
}

/**
 * 値上げ・値下げの一覧。
 *
 * 並び順は「年額でいくら変わったか」。月額の差が小さくても、年払いなら
 * 効きが大きい。金額の前後と変化率も出し、なぜその順なのかを読めるようにする。
 */
export function PriceChangesClient({
  rows,
  currency = "JPY",
}: {
  rows: PriceChangeView[];
  currency?: string;
}) {
  const [filter, setFilter] = useState<"ALL" | "UP" | "DOWN">("ALL");

  const shown = rows.filter((r) =>
    filter === "ALL" ? true : filter === "UP" ? r.diff > 0 : r.diff < 0,
  );

  // 合計は「いま契約が続いているもの」だけを足す。解約済みの改定まで
  // 足すと、実際には払っていない額が年間の増減として出てしまう。
  const activeRows = rows.filter((r) => r.active);
  const yearlyUp = activeRows.filter((r) => r.diff > 0).reduce((s, r) => s + r.yearlyDiff, 0);
  const yearlyDown = activeRows.filter((r) => r.diff < 0).reduce((s, r) => s + r.yearlyDiff, 0);
  const net = yearlyUp + yearlyDown;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ChartIcon size={28} />}
        title="価格の変更はまだありません"
        description="サブスクの金額を変更して保存すると、その前後がここに記録されます。"
      />
    );
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">値上げの年間影響</div>
          <div className="mt-1 text-[20px] font-bold tabular-nums text-expense">
            +{formatMoney(yearlyUp, currency)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">値下げの年間影響</div>
          <div className="mt-1 text-[20px] font-bold tabular-nums text-income">
            {formatMoney(yearlyDown, currency)}
          </div>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <div className="text-[12px] text-text-tertiary">差引</div>
          <div className="mt-1 text-[20px] font-bold tabular-nums">
            {net > 0 ? "+" : ""}
            {formatMoney(net, currency)}
          </div>
        </Card>
      </div>

      <p className="mb-4 text-[12px] leading-relaxed text-text-tertiary">
        合計は、いま契約が続いているサブスクの改定だけを足しています。
        金額は「1年あたりいくら変わったか」に直してあるため、月払いと年払いを
        そのまま比べられます。
      </p>

      <div className="mb-4">
        <Segmented<"ALL" | "UP" | "DOWN">
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "すべて" },
            { value: "UP", label: "値上げ" },
            { value: "DOWN", label: "値下げ" },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<ChartIcon size={28} />}
          title="該当する変更がありません"
          description="絞り込みを「すべて」に戻すと、記録されている変更をすべて表示します。"
        />
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{r.name}</span>
                {!r.active && <Badge size="sm">{r.statusLabel}</Badge>}
                <Badge tone={r.diff > 0 ? "expense" : "income"} size="sm">
                  {r.diff > 0 ? "値上げ" : "値下げ"}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] tabular-nums">
                <span className="text-text-tertiary line-through">
                  {formatMoney(r.oldAmount, currency)}
                </span>
                <span className="text-text-tertiary">→</span>
                <span className={r.diff > 0 ? "font-semibold text-expense" : "font-semibold text-income"}>
                  {formatMoney(r.newAmount, currency)}
                </span>
                <span className="text-[13px] text-text-secondary">
                  （{r.diff > 0 ? "+" : ""}
                  {formatMoney(r.diff, currency)}
                  {r.percent !== null && `・${r.percent > 0 ? "+" : ""}${r.percent.toFixed(1)}%`}）
                </span>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[12px] text-text-tertiary">
                <span>{r.dateLabel}</span>
                <span className="tabular-nums">
                  年間 {r.yearlyDiff > 0 ? "+" : ""}
                  {formatMoney(r.yearlyDiff, currency)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
