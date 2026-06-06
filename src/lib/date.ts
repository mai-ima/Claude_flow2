import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { BillingCycle } from "./enums";

export function formatDate(date: Date, pattern = "yyyy年M月d日"): string {
  return format(date, pattern, { locale: ja });
}

export function formatMonth(date: Date): string {
  return format(date, "yyyy年M月", { locale: ja });
}

/** <input type="date"> 用に「ローカル日付」を yyyy-MM-dd で返す。 */
export function toDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * 本日のローカル日付（yyyy-MM-dd）。`new Date().toISOString().slice(0,10)` は
 * UTC 基準のため早朝（JST 等）に前日へずれる不具合があり、その置き換え用。
 */
export function todayLocal(): string {
  return toDateInput(new Date());
}

/**
 * 日付文字列を「ローカルタイム」で解釈して Date を返す。
 * `new Date("2026-06-01")` は UTC 深夜と解釈され、JST 等では前日へずれるため、
 * `yyyy-MM-dd` / `yyyy/M/d`（ゼロ埋め有無を許容）はローカルで生成する。
 * それ以外の形式は標準パースにフォールバック。CSV 取込などで使用。
 */
export function parseDateInput(value: string): Date {
  const s = value.trim();
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
  }
  return new Date(s);
}

export function monthRange(anchor: Date): { start: Date; end: Date } {
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

/** 次の更新日を周期に応じて進める。 */
export function advanceRenewal(date: Date, cycle: BillingCycle): Date {
  switch (cycle) {
    case "MONTHLY":
      return addMonths(date, 1);
    case "YEARLY":
      return addYears(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "QUARTERLY":
      return addMonths(date, 3);
  }
}

/** 今日から見た残り日数（過ぎていれば負）。 */
export function daysUntil(date: Date, from: Date = new Date()): number {
  return differenceInCalendarDays(date, from);
}

/** 最終利用日からの経過日数。null は未記録。 */
export function daysSince(date: Date | null, from: Date = new Date()): number | null {
  if (!date) return null;
  return differenceInCalendarDays(from, date);
}

/** 今日から見た残り月数（暦月差）。過ぎていれば負。 */
export function monthsUntil(date: Date, from: Date = new Date()): number {
  return differenceInCalendarMonths(date, from);
}

/**
 * 指定した「毎月の実行日(1-28)」について、from より後（同日含まず）の
 * 直近の実行日を返す。自動積立の次回日算出に用いる純関数。
 */
export function nextMonthlyDate(day: number, from: Date = new Date()): Date {
  const d = Math.min(28, Math.max(1, Math.floor(day)));
  const candidate = new Date(from.getFullYear(), from.getMonth(), d, 0, 0, 0, 0);
  if (candidate > from) return candidate;
  return new Date(from.getFullYear(), from.getMonth() + 1, d, 0, 0, 0, 0);
}
