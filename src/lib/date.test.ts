import { describe, it, expect } from "vitest";
import {
  advanceRenewal,
  daysUntil,
  daysSince,
  toDateInput,
  nextMonthlyDate,
  parseDateInput,
  buildCalendarWeeks,
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
