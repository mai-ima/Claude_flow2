import { describe, it, expect } from "vitest";
import {
  checkPurge,
  purgeCutoff,
  purgePresets,
  AUDIT_MIN_RETENTION_DAYS,
  PURGE_MAX_IDS,
} from "./log-purge";

describe("checkPurge", () => {
  const noReason = { hasReason: false };
  const withReason = { hasReason: true };

  it("対象が無ければ消さない", () => {
    expect(checkPurge({ kind: "CRON" }, noReason)).toEqual({
      ok: false,
      code: "PURGE_NO_TARGET",
    });
    // 空配列は「選んでいない」と同じ。ここを通すと全件削除になる。
    expect(checkPurge({ kind: "CRON", ids: [] }, noReason)).toEqual({
      ok: false,
      code: "PURGE_NO_TARGET",
    });
  });

  it("選択と日数の同時指定は受け付けない", () => {
    expect(checkPurge({ kind: "CRON", ids: ["a"], olderThanDays: 30 }, noReason)).toEqual({
      ok: false,
      code: "PURGE_AMBIGUOUS",
    });
  });

  it("選んで消せる件数には上限がある", () => {
    const ids = Array.from({ length: PURGE_MAX_IDS + 1 }, (_, i) => String(i));
    expect(checkPurge({ kind: "EMAIL", ids }, noReason)).toEqual({
      ok: false,
      code: "PURGE_TOO_MANY",
    });
    expect(checkPurge({ kind: "EMAIL", ids: ids.slice(0, PURGE_MAX_IDS) }, noReason)).toEqual({
      ok: true,
    });
  });

  it("運用の控えは選んでもまとめても消せる", () => {
    for (const kind of ["CRON", "EMAIL", "ERROR"] as const) {
      expect(checkPurge({ kind, ids: ["a", "b"] }, noReason)).toEqual({ ok: true });
      expect(checkPurge({ kind, olderThanDays: 30 }, noReason)).toEqual({ ok: true });
      // 0 日 = すべて。運用の控えなら許す。
      expect(checkPurge({ kind, olderThanDays: 0 }, noReason)).toEqual({ ok: true });
    }
  });

  it("監査ログは1件だけ選んで消せない", () => {
    expect(checkPurge({ kind: "AUDIT", ids: ["a"] }, withReason)).toEqual({
      ok: false,
      code: "AUDIT_NO_SELECTIVE_DELETE",
    });
  });

  it("監査ログは新しいものを消せない", () => {
    expect(
      checkPurge({ kind: "AUDIT", olderThanDays: AUDIT_MIN_RETENTION_DAYS - 1 }, withReason),
    ).toEqual({ ok: false, code: "AUDIT_MIN_RETENTION" });
    expect(checkPurge({ kind: "AUDIT", olderThanDays: 0 }, withReason)).toEqual({
      ok: false,
      code: "AUDIT_MIN_RETENTION",
    });
  });

  it("監査ログは理由が要る", () => {
    expect(checkPurge({ kind: "AUDIT", olderThanDays: 365 }, noReason)).toEqual({
      ok: false,
      code: "REASON_REQUIRED",
    });
    expect(checkPurge({ kind: "AUDIT", olderThanDays: 365 }, withReason)).toEqual({ ok: true });
  });
});

describe("purgeCutoff", () => {
  it("日数ぶん遡った時刻になる", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(purgeCutoff(30, now).toISOString()).toBe("2026-07-02T12:00:00.000Z");
  });

  it("0日なら現在時刻（=すべてが対象）", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(purgeCutoff(0, now).getTime()).toBe(now.getTime());
  });
});

describe("purgePresets", () => {
  it("監査ログには「すべて削除」を出さない", () => {
    expect(purgePresets("AUDIT").some((p) => p.days === 0)).toBe(false);
    // 出す選択肢はどれも保存期間を満たすこと。
    for (const p of purgePresets("AUDIT")) {
      expect(p.days).toBeGreaterThanOrEqual(AUDIT_MIN_RETENTION_DAYS);
    }
  });

  it("運用の控えには「すべて削除」がある", () => {
    expect(purgePresets("CRON").some((p) => p.days === 0)).toBe(true);
  });
});
