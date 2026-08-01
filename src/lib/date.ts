import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { BillingCycle } from "./enums";

/**
 * このアプリが基準にする時間帯。
 *
 * 日本国内の家計簿なので、日付の境目はすべて日本時間で決める。
 * 「8月1日の記録」は日本時間の 8/1 00:00〜23:59 に入ったものであって、
 * 見ている人の端末やサーバーの設定で変わってよいものではない。
 *
 * サーバー側は src/instrumentation.ts で TZ を日本時間に固定している。
 * ただしそれに頼りきらず、日付の切り出し・書き出し・入力欄の値は
 * 下の関数を通して、実行環境の設定に関係なく日本時間で扱う。
 * ブラウザ側には TZ を強制する手段が無いため、なおさら必要になる。
 */
export const APP_TIME_ZONE = "Asia/Tokyo";

/**
 * 日本標準時の時差。日本には夏時間が無いので固定値でよい
 * （1951年を最後に実施されていない）。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 「UTC として読むと日本時間の値になる」Date を作る。
 *
 * この Date は時刻としては9時間ずれた別物なので、外に出してはいけない。
 * 年月日を取り出すためだけに使い、必ず getUTC* 側で読む。
 */
function asJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** 日本時間での年月日。集計のバケットや書き出しの日付欄に使う。 */
export function dateKeyJST(date: Date): string {
  const d = asJst(date);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

/** 日本時間での yyyy-MM-ddTHH:mm。`<input type="datetime-local">` の値に使う。 */
export function dateTimeInputJST(date: Date): string {
  const d = asJst(date);
  return `${dateKeyJST(date)}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

/**
 * 「日本時間の yyyy-MM-dd（省略時 00:00）」を指す Date に戻す。
 *
 * `new Date("2026-08-01")` は UTC 深夜と解釈されるため、そのまま使うと
 * 日本時間では 9時 を指す。日付の入力欄から受け取った値はここを通す。
 */
export function fromInputJST(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value.trim());
  if (!m) return new Date(value);
  const [, y, mo, d, hh, mi] = m;
  return new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh ?? 0), Number(mi ?? 0)) -
      JST_OFFSET_MS,
  );
}

/** 画面に出す日時の形。 */
export type JstStyle = "date" | "dateShort" | "dateTime" | "dateTimeShort" | "time";

/**
 * 日本時間で整形する。ブラウザやサーバーの時間帯に左右されない。
 *
 * date-fns の format を使わないのは、あれが実行環境の時間帯で読むため。
 * 打ち消す計算を挟むこともできるが、夏時間のある地域で境目がずれる。
 * 日本時間は UTC+9 固定なので、数値から直に組み立てるほうが確実で短い。
 */
export function formatJST(date: Date | string, style: JstStyle = "date"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const j = asJst(d);
  const y = j.getUTCFullYear();
  const mo = j.getUTCMonth() + 1;
  const da = j.getUTCDate();
  const hm = `${p2(j.getUTCHours())}:${p2(j.getUTCMinutes())}`;
  switch (style) {
    case "date":
      return `${y}年${mo}月${da}日`;
    case "dateShort":
      return `${mo}月${da}日`;
    case "dateTime":
      return `${y}年${mo}月${da}日 ${hm}`;
    case "dateTimeShort":
      return `${mo}/${da} ${hm}`;
    case "time":
      return hm;
  }
}

/**
 * 「実行環境のローカル時刻として読むと日本時間の値になる」Date。
 *
 * date-fns の format は渡された Date を実行環境の時間帯で読む。
 * 日本時間で書かせるには、環境との差ぶんだけずらしたものを渡すしかない。
 * 実行環境がすでに日本時間なら差は 0 で、何も変わらない。
 */
function jstMirror(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS + date.getTimezoneOffset() * 60 * 1000);
}

/**
 * ある瞬間を日本時間で書く。
 *
 * 「いつ記録されたか」「いつ送られたか」のように、実際に起きた時刻を
 * 表示するときに使う。サーバーの時間帯設定が外れていても、日本時間で出る。
 *
 * 暦の上の日付（カレンダーの升目、入力欄から作った日付）には使わない。
 * あれは時刻を持たない「8月1日」そのものなので、時間帯の変換をかけると
 * 逆にずれる。そちらは formatCalendarDay を使う。
 */
export function formatDate(date: Date, pattern = "yyyy年M月d日"): string {
  return format(jstMirror(date), pattern, { locale: ja });
}

/**
 * 暦の上の日付をそのまま書く。
 *
 * 引数はカレンダーの升目のように、その環境で「その日の0時」として
 * 作られた Date であることを前提にする。時間帯の変換はしない。
 */
export function formatCalendarDay(date: Date, pattern = "yyyy年M月d日"): string {
  return format(date, pattern, { locale: ja });
}

/** 「2026年8月」。日本時間で見た年月を書く。 */
export function formatMonth(date: Date): string {
  return format(jstMirror(date), "yyyy年M月", { locale: ja });
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

/** 日本時間で見た「その日の 0:00」を指す瞬間。 */
export function startOfDayJST(date: Date = new Date()): Date {
  const j = asJst(date);
  return new Date(
    Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate()) - JST_OFFSET_MS,
  );
}

/** 日本時間で見た曜日（0=日曜）。「月曜だけ送る」のような判定に使う。 */
export function dayOfWeekJST(date: Date = new Date()): number {
  return asJst(date).getUTCDay();
}

/** 日本時間で見た日（1〜31）。 */
export function dayOfMonthJST(date: Date = new Date()): number {
  return asJst(date).getUTCDate();
}

/** 日本時間で見た年と月（月は 0 始まり）。 */
export function jstYearMonth(date: Date): { year: number; month: number } {
  const j = asJst(date);
  return { year: j.getUTCFullYear(), month: j.getUTCMonth() };
}

/**
 * 日本時間のその月の1日 0:00 を指す瞬間。
 * 「表示中の月」を表す値（アンカー）は、すべてこの形で持つ。
 */
export function monthAnchorJST(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS);
}

/** 月のアンカーを n か月ずらす。日本時間の暦で数える。 */
export function addMonthsJST(anchor: Date, n: number): Date {
  const { year, month } = jstYearMonth(anchor);
  return monthAnchorJST(year, month + n);
}

/**
 * その月の始まりと終わり。
 *
 * 日本時間で切る。実行環境が UTC のままだと、日本時間の 8/1 00:00〜08:59 に
 * 付けた記録が7月の集計に入り、月をまたいだ瞬間だけ数字が合わなくなる
 * （しかも翌朝には直るので、見ていた人には再現できない）。
 */
export function monthRange(anchor: Date): { start: Date; end: Date } {
  const { year, month } = jstYearMonth(anchor);
  return {
    start: monthAnchorJST(year, month),
    end: new Date(monthAnchorJST(year, month + 1).getTime() - 1),
  };
}

/**
 * カレンダー表示用の週配列（日曜始まり）。前後の月から埋め日を含めて
 * 各週が必ず7日になるよう返す。週数は月によって 4〜6 と変動する。
 */
export function buildCalendarWeeks(month: Date): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
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
