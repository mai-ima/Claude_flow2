import { describe, expect, it } from "vitest";
import { describeDevice } from "./user-agent";

describe("describeDevice", () => {
  it("iPhone の Safari", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone の Safari");
  });

  it("Windows の Chrome", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      ),
    ).toBe("Windows の Chrome");
  });

  it("Edge は Chrome と誤判定しない", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
      ),
    ).toBe("Windows の Edge");
  });

  it("iOS の Chrome は Safari と誤判定しない", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone の Chrome");
  });

  it("Android の Chrome", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Android の Chrome");
  });

  it("記録が無いときは不明な端末", () => {
    expect(describeDevice(null)).toBe("不明な端末");
    expect(describeDevice("")).toBe("不明な端末");
    expect(describeDevice("curl/8.5.0")).toBe("不明な端末");
  });
});
