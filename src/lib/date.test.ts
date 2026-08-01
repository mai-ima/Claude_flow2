import { describe, it, expect } from "vitest";
import {
  advanceRenewal,
  daysUntil,
  daysSince,
  toDateInput,
  nextMonthlyDate,
  parseDateInput,
  buildCalendarWeeks,
  dateKeyJST,
  dateTimeInputJST,
  fromInputJST,
  formatJST,
  formatDate,
  formatCalendarDay,
  monthRange,
  monthAnchorJST,
  addMonthsJST,
  jstYearMonth,
  startOfDayJST,
  dayOfWeekJST,
} from "./date";

describe("advanceRenewal", () => {
  const base = new Date("2026-01-15T00:00:00");
  it("月次は1ヶ月後", () => {
    expect(advanceRenewal(base, "MONTHLY").getMonth()).toBe(1); // 2月
  });
  it("年次は1年後", () => {
    expect(advanceRenewal(base, "YEARLY").getFullYear()).toBe(2027);
  });
  it("四半期は3ヶ月後", () => {
    expect(advanceRenewal(base, "QUARTERLY").getMonth()).toBe(3); // 4月
  });
  it("週次は7日後", () => {
    expect(advanceRenewal(base, "WEEKLY").getDate()).toBe(22);
  });
});

describe("daysUntil / daysSince", () => {
  const now = new Date("2026-06-01T12:00:00");
  it("daysUntil 未来は正", () => {
    expect(daysUntil(new Date("2026-06-04T00:00:00"), now)).toBe(3);
  });
  it("daysSince 過去は正、null は null", () => {
    expect(daysSince(new Date("2026-05-29T00:00:00"), now)).toBe(3);
    expect(daysSince(null, now)).toBeNull();
  });
});

describe("toDateInput", () => {
  it("ローカル日付を yyyy-MM-dd で返す", () => {
    expect(toDateInput(new Date(2026, 5, 5))).toBe("2026-06-05");
    expect(toDateInput(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toDateInput(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("nextMonthlyDate", () => {
  it("当月の指定日が未来ならその日", () => {
    expect(toDateInput(nextMonthlyDate(15, new Date(2026, 5, 5, 12)))).toBe("2026-06-15");
  });
  it("当月の指定日が当日/過去なら翌月", () => {
    expect(toDateInput(nextMonthlyDate(15, new Date(2026, 5, 15, 12)))).toBe("2026-07-15");
    expect(toDateInput(nextMonthlyDate(10, new Date(2026, 5, 20)))).toBe("2026-07-10");
  });
  it("day は 1-28 にクランプ", () => {
    expect(nextMonthlyDate(40, new Date(2026, 5, 1)).getDate()).toBe(28);
    expect(nextMonthlyDate(0, new Date(2026, 5, 1)).getDate()).toBe(1);
  });
  it("12月から翌年へ繰り越す", () => {
    expect(toDateInput(nextMonthlyDate(10, new Date(2026, 11, 20)))).toBe("2027-01-10");
  });
});

describe("parseDateInput", () => {
  it("yyyy-MM-dd をローカル日付として解釈（UTCずれ無し）", () => {
    const d = parseDateInput("2026-06-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
    // ローカル基準のため toDateInput で往復一致。
    expect(toDateInput(d)).toBe("2026-06-01");
  });

  it("スラッシュ区切り・ゼロ埋め無しを許容", () => {
    expect(toDateInput(parseDateInput("2026/6/5"))).toBe("2026-06-05");
    expect(toDateInput(parseDateInput("2026/12/31"))).toBe("2026-12-31");
  });

  it("非対応形式は標準パースにフォールバック", () => {
    expect(Number.isNaN(parseDateInput("not-a-date").getTime())).toBe(true);
  });
});

describe("buildCalendarWeeks", () => {
  it("各週は必ず7日、先頭は日曜・末尾は土曜", () => {
    const weeks = buildCalendarWeeks(new Date(2026, 6, 1)); // 2026-07
    for (const w of weeks) {
      expect(w).toHaveLength(7);
      expect(w[0].getDay()).toBe(0);
      expect(w[6].getDay()).toBe(6);
    }
  });

  it("月初が水曜の月は前月の埋め日から始まる", () => {
    // 2026-07-01 は水曜。週は 6/28(日) から始まる。
    const weeks = buildCalendarWeeks(new Date(2026, 6, 1));
    expect(toDateInput(weeks[0][0])).toBe("2026-06-28");
    expect(toDateInput(weeks[0][3])).toBe("2026-07-01");
  });

  it("月初が日曜の月は埋め日なしで始まる", () => {
    // 2026-11-01 は日曜。
    const weeks = buildCalendarWeeks(new Date(2026, 10, 1));
    expect(toDateInput(weeks[0][0])).toBe("2026-11-01");
  });

  it("当月の全日を過不足なく含む（うるう年2月）", () => {
    const weeks = buildCalendarWeeks(new Date(2028, 1, 1)); // 2028-02 は29日
    const inMonth = weeks.flat().filter((d) => d.getMonth() === 1 && d.getFullYear() === 2028);
    expect(inMonth).toHaveLength(29);
  });

  it("末尾は当月末以降の土曜まで埋まる", () => {
    // 2026-01-31 は土曜 → 埋め日なしで終わる。
    const weeks = buildCalendarWeeks(new Date(2026, 0, 1));
    const last = weeks[weeks.length - 1];
    expect(toDateInput(last[6])).toBe("2026-01-31");
  });
});

/**
 * 日本時間の扱い。
 *
 * ここが狂うと「8月1日に付けた記録が7月に入る」といった形で、
 * 見た目では気づきにくいまま集計がずれる。実行環境の時間帯に
 * 左右されないことを、UTC の値から確かめる。
 */
describe("日本時間の切り出し", () => {
  it("UTC の深夜は日本時間では同じ日の朝", () => {
    // 2026-08-01T00:00Z = 日本時間 8/1 09:00
    expect(dateKeyJST(new Date("2026-08-01T00:00:00Z"))).toBe("2026-08-01");
  });

  it("UTC の夕方は日本時間ではもう翌日", () => {
    // 2026-07-31T15:00Z = 日本時間 8/1 00:00。ここが月の境目になる。
    expect(dateKeyJST(new Date("2026-07-31T15:00:00Z"))).toBe("2026-08-01");
    expect(dateKeyJST(new Date("2026-07-31T14:59:59Z"))).toBe("2026-07-31");
  });

  it("入力欄の値は日本時間として読み書きできる（往復して同じ）", () => {
    const iso = "2026-08-01T03:30";
    const d = fromInputJST(iso);
    // 日本時間 8/1 03:30 は UTC では 7/31 18:30。
    expect(d.toISOString()).toBe("2026-07-31T18:30:00.000Z");
    expect(dateTimeInputJST(d)).toBe(iso);
  });

  it("日付だけの入力はその日の 0時（日本時間）を指す", () => {
    expect(fromInputJST("2026-08-01").toISOString()).toBe("2026-07-31T15:00:00.000Z");
  });

  it("整形は日本時間で行う", () => {
    const d = new Date("2026-07-31T15:05:00Z"); // 日本時間 8/1 00:05
    expect(formatJST(d, "date")).toBe("2026年8月1日");
    expect(formatJST(d, "dateShort")).toBe("8月1日");
    expect(formatJST(d, "dateTime")).toBe("2026年8月1日 00:05");
    expect(formatJST(d, "dateTimeShort")).toBe("8/1 00:05");
    expect(formatJST(d, "time")).toBe("00:05");
  });

  it("文字列でも受け取れる", () => {
    expect(formatJST("2026-07-31T15:00:00Z", "date")).toBe("2026年8月1日");
  });

  it("壊れた値では例外を投げず空文字を返す", () => {
    expect(formatJST("これは日付ではない")).toBe("");
  });

  it("年をまたぐ深夜も取り違えない", () => {
    // 2025-12-31T15:00Z = 日本時間 2026-01-01 00:00
    expect(dateKeyJST(new Date("2025-12-31T15:00:00Z"))).toBe("2026-01-01");
    expect(formatJST(new Date("2025-12-31T14:59:00Z"), "date")).toBe("2025年12月31日");
  });
});

describe("formatDate（起きた時刻を日本時間で書く）", () => {
  it("実行環境の時間帯に関わらず日本時間で出る", () => {
    // 2026-07-31T15:00Z は日本時間の 8/1 00:00。
    const d = new Date("2026-07-31T15:00:00Z");
    expect(formatDate(d, "yyyy年M月d日")).toBe("2026年8月1日");
    expect(formatDate(d, "M月d日 HH:mm")).toBe("8月1日 00:00");
  });

  it("日本時間で日をまたぐ直前は前日のまま", () => {
    const d = new Date("2026-07-31T14:59:00Z");
    expect(formatDate(d, "yyyy年M月d日")).toBe("2026年7月31日");
  });

  it("曜日も日本時間で決まる", () => {
    // 2026-08-01 は土曜。日本時間 0:05 の時点で「土」。
    expect(formatDate(new Date("2026-07-31T15:05:00Z"), "E")).toBe("土");
  });
});

describe("formatCalendarDay（暦の日付をそのまま書く）", () => {
  it("時間帯の変換をしない", () => {
    // カレンダーの升目のように、その環境の 0時 として作った日付。
    const day = new Date(2026, 7, 1);
    expect(formatCalendarDay(day, "M月d日")).toBe("8月1日");
  });
});

/**
 * 月の境目。
 *
 * ここが UTC のままだと、日本時間の 8/1 00:00〜08:59 に付けた記録が
 * 7月の集計に入る。翌朝には直るので、見ていた人には再現できない形で
 * 「金額が合わない」と言われることになる。
 */
describe("monthRange（月の始まりと終わり）", () => {
  it("日本時間の月初 0:00 から月末 23:59:59.999 まで", () => {
    const anchor = monthAnchorJST(2026, 7); // 2026年8月
    const { start, end } = monthRange(anchor);
    expect(start.toISOString()).toBe("2026-07-31T15:00:00.000Z"); // 日本時間 8/1 00:00
    expect(end.toISOString()).toBe("2026-08-31T14:59:59.999Z"); // 日本時間 8/31 23:59:59.999
  });

  it("日本時間の 8/1 00:30 の記録は8月に入る", () => {
    const { start, end } = monthRange(monthAnchorJST(2026, 7));
    const t = new Date("2026-07-31T15:30:00Z"); // 日本時間 8/1 00:30
    expect(t >= start && t <= end).toBe(true);
  });

  it("日本時間の 7/31 23:30 の記録は8月に入らない", () => {
    const { start } = monthRange(monthAnchorJST(2026, 7));
    const t = new Date("2026-07-31T14:30:00Z"); // 日本時間 7/31 23:30
    expect(t >= start).toBe(false);
  });

  it("「今この瞬間」を渡しても日本時間の月で切れる", () => {
    // 日本時間 8/1 05:00（UTC ではまだ 7/31）。
    const now = new Date("2026-07-31T20:00:00Z");
    expect(jstYearMonth(now)).toEqual({ year: 2026, month: 7 });
    expect(monthRange(now).start.toISOString()).toBe("2026-07-31T15:00:00.000Z");
  });

  it("12月から1月へ、年をまたいでも数え違えない", () => {
    const dec = monthAnchorJST(2026, 11);
    expect(jstYearMonth(addMonthsJST(dec, 1))).toEqual({ year: 2027, month: 0 });
    expect(jstYearMonth(addMonthsJST(dec, -1))).toEqual({ year: 2026, month: 10 });
  });

  it("うるう年の2月も月末まで含む", () => {
    const { end } = monthRange(monthAnchorJST(2028, 1)); // 2028年2月は29日
    expect(end.toISOString()).toBe("2028-02-29T14:59:59.999Z");
  });
});

describe("日本時間での日と曜日", () => {
  it("その日の 0:00 は日本時間で決まる", () => {
    // 日本時間 8/1 05:00
    expect(startOfDayJST(new Date("2026-07-31T20:00:00Z")).toISOString()).toBe(
      "2026-07-31T15:00:00.000Z",
    );
  });

  it("日本時間で月曜の朝は、UTC ではまだ日曜", () => {
    // 2026-08-03 は月曜。日本時間 05:00 = UTC 8/2 20:00（日曜）。
    const t = new Date("2026-08-02T20:00:00Z");
    expect(dayOfWeekJST(t)).toBe(1);
    expect(t.getUTCDay()).toBe(0);
  });
});
