import { describe, it, expect } from "vitest";
import { renewalCatchup, isReminderDue } from "./renewal";

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
