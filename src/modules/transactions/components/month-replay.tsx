"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlayIcon, RepeatIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { ReplayDay } from "../queries";

/**
 * 「月のリプレイ」: 当月の支出を 1 日ずつ再生し、累計がせり上がる様子を可視化。
 * 再生/一時停止/最初から、スクラブ（スライダー）に対応。正式機能。
 */
export function MonthReplay({
  days,
  daysInMonth,
  monthLabel,
  currency = "JPY",
}: {
  days: ReplayDay[];
  daysInMonth: number;
  monthLabel: string;
  currency?: string;
}) {
  const [current, setCurrent] = useState(daysInMonth); // 1..daysInMonth
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 累計（各日までの合計）と 1 日あたりの最大支出（バー高さの正規化用）。
  const { cumExpense, cumIncome, maxDay } = useMemo(() => {
    let ce = 0;
    let ci = 0;
    const cumE: number[] = [];
    const cumI: number[] = [];
    let max = 1;
    for (const d of days) {
      ce += d.expense;
      ci += d.income;
      cumE.push(ce);
      cumI.push(ci);
      if (d.expense > max) max = d.expense;
    }
    return { cumExpense: cumE, cumIncome: cumI, maxDay: max };
  }, [days]);

  function stop() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setPlaying(false);
  }

  function play() {
    // 末尾まで再生済みなら最初から。
    setCurrent((c) => (c >= daysInMonth ? 1 : c));
    setPlaying(true);
  }

  // 再生ループ（約6秒で1ヶ月分）。
  useEffect(() => {
    if (!playing) return;
    const step = Math.max(45, Math.round(6000 / daysInMonth));
    timer.current = setInterval(() => {
      setCurrent((c) => {
        if (c >= daysInMonth) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, step);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [playing, daysInMonth]);

  const idx = current - 1;
  const expenseNow = cumExpense[idx] ?? 0;
  const incomeNow = cumIncome[idx] ?? 0;
  const balanceNow = incomeNow - expenseNow;

  return (
    <div>
      {/* 累計サマリー */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[12px] text-text-tertiary">{monthLabel}{current}日までの支出</div>
          <div className="mt-0.5 text-[30px] font-bold leading-none tabular-nums">
            {formatMoney(expenseNow, currency)}
          </div>
          <div className="mt-1.5 flex gap-4 text-[12px]">
            <span className="text-text-secondary">
              収入 <b className="tabular-nums text-income">{formatMoney(incomeNow, currency)}</b>
            </span>
            <span className="text-text-secondary">
              収支{" "}
              <b className={cn("tabular-nums", balanceNow >= 0 ? "text-income" : "text-expense")}>
                {formatMoney(balanceNow, currency)}
              </b>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(1)}
            aria-label="最初から"
            className="grid h-10 w-10 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
          >
            <RepeatIcon size={18} />
          </button>
          <button
            onClick={() => (playing ? stop() : play())}
            aria-label={playing ? "一時停止" : "再生"}
            className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white shadow-sm transition duration-[var(--dur-1)] ease-spring hover:bg-accent-hover active:scale-95"
          >
            {playing ? (
              <span className="flex gap-1">
                <span className="h-4 w-1 rounded-sm bg-white" />
                <span className="h-4 w-1 rounded-sm bg-white" />
              </span>
            ) : (
              <PlayIcon size={22} />
            )}
          </button>
        </div>
      </div>

      {/* 日別バー（現在日まで着色・当日を強調） */}
      <div className="mt-4 flex h-24 items-end gap-[3px]">
        {days.map((d) => {
          const active = d.day <= current;
          const isCurrent = d.day === current;
          const h = Math.max(2, Math.round((d.expense / maxDay) * 100));
          return (
            <button
              key={d.day}
              onClick={() => {
                stop();
                setCurrent(d.day);
              }}
              aria-label={`${d.day}日`}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <span
                className={cn(
                  "absolute bottom-0 left-0 w-full rounded-t-[3px] transition-all duration-[var(--dur-1)] ease-spring",
                  isCurrent ? "bg-accent" : active ? "bg-accent/45" : "bg-surface-2",
                )}
                style={{ height: `${h}%` }}
              />
            </button>
          );
        })}
      </div>

      {/* スクラブ */}
      <input
        type="range"
        min={1}
        max={daysInMonth}
        value={current}
        onChange={(e) => {
          stop();
          setCurrent(Number(e.target.value));
        }}
        aria-label="日付をスクラブ"
        className="mt-3 w-full accent-accent"
      />
      <div className="mt-1 flex justify-between text-[11px] text-text-tertiary tabular-nums">
        <span>1日</span>
        <span>{monthLabel}{current}日</span>
        <span>{daysInMonth}日</span>
      </div>
    </div>
  );
}
