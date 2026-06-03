import { describe, it, expect } from "vitest";
import { SERVICE_CATALOG, findService } from "./service-catalog";

describe("service-catalog", () => {
  it("主要サービスを40件以上収録", () => {
    expect(SERVICE_CATALOG.length).toBeGreaterThanOrEqual(40);
  });
  it("key は一意", () => {
    const keys = SERVICE_CATALOG.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("各サービスは解約URLと手順を持つ", () => {
    for (const s of SERVICE_CATALOG) {
      expect(s.name).toBeTruthy();
      expect(s.cancelUrl).toMatch(/^https?:\/\//);
      expect(s.cancelSteps.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("findService で引ける", () => {
    expect(findService("netflix")?.name).toBe("Netflix");
    expect(findService("disney-plus")?.name).toBe("Disney+");
    expect(findService(null)).toBeUndefined();
  });
});
