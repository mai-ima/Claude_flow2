import { describe, it, expect } from "vitest";
import { renewalCatchup, isReminderDue, advanceTo } from "./renewal";

describe("renewalCatchup", () => {
  it("更新日が未来なら発生なし", () => {
    const now = new Date("2026-06-01");
    const next = new Date("2026-06-10");
    const r = renewalCatchup(next, "MONTHLY", now);
    expect(r.occurrences).toHaveLength(0);
    expect(r.nextRenewalAt).toEqual(next);
  });

  it("過去の月次は取りこぼし分を全て発生させ次回を未来へ", () => {
    const now = new Date("2026-06-01");
    const next = new Date("2026-03-15"); // 3ヶ月遅れ
    const r = renewalCatchup(next, "MONTHLY", now);
    expect(r.occurrences.length).toBe(3); // 3/15, 4/15, 5/15
    expect(r.nextRenewalAt > now).toBe(true);
  });

  it("maxGuard で暴走を防ぐ", () => {
    const now = new Date("2030-01-01");
    const next = new Date("2000-01-01");
    const r = renewalCatchup(next, "MONTHLY", now, 24);
    expect(r.occurrences.length).toBe(24);
  });
});

describe("isReminderDue", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  it("当日は対象", () => {
    expect(isReminderDue(new Date("2026-06-01T00:00:00Z"), 3, now)).toBe(true);
  });
  it("3日後は対象（しきい値3）", () => {
    expect(isReminderDue(new Date("2026-06-04T00:00:00Z"), 3, now)).toBe(true);
  });
  it("4日後は対象外", () => {
    expect(isReminderDue(new Date("2026-06-05T00:00:00Z"), 3, now)).toBe(false);
  });
  it("過去は対象外", () => {
    expect(isReminderDue(new Date("2026-05-30T00:00:00Z"), 3, now)).toBe(false);
  });
});

describe("advanceTo", () => {
  const from = new Date(2026, 6, 1); // 2026-07-01

  it("既に from 以降ならそのまま", () => {
    const d = new Date(2026, 7, 10);
    expect(advanceTo(d, "MONTHLY", from).getTime()).toBe(d.getTime());
  });
  it("月次: 過去から一度に追いつく", () => {
    const r = advanceTo(new Date(2025, 0, 15), "MONTHLY", from);
    expect(r >= from).toBe(true);
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(6); // 7月15日
    expect(r.getDate()).toBe(15);
  });
  it("週次: 遠い過去でも from 以降の最初の週に来る", () => {
    const r = advanceTo(new Date(2024, 0, 3), "WEEKLY", from);
    expect(r >= from).toBe(true);
    // 1周期(7日)以内に収まる
    expect(r.getTime() - from.getTime()).toBeLessThan(7 * 24 * 60 * 60 * 1000);
  });
  it("年次: 年をまたいで追いつく", () => {
    const r = advanceTo(new Date(2020, 10, 5), "YEARLY", from);
    expect(r >= from).toBe(true);
    expect(r.getMonth()).toBe(10); // 11月5日
  });
  it("四半期: 3ヶ月刻みを保つ", () => {
    const start = new Date(2025, 0, 20);
    const r = advanceTo(start, "QUARTERLY", from);
    expect(r >= from).toBe(true);
    const months = (r.getFullYear() - 2025) * 12 + (r.getMonth() - 0);
    expect(months % 3).toBe(0);
  });
});
