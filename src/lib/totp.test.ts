import { describe, expect, it } from "vitest";
import {
  base32Encode,
  base32Decode,
  totpCode,
  verifyTotp,
  totpUri,
  generateTotpSecret,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from "./totp";

/** RFC 6238 の試験用鍵 "12345678901234567890" を Base32 にしたもの。 */
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("base32", () => {
  it("往復して元に戻る", () => {
    const buf = Buffer.from("12345678901234567890");
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
  });

  it("既知の値と一致する", () => {
    expect(base32Encode(Buffer.from("Hello!"))).toBe("JBSWY3DPEE");
  });

  it("空白・ハイフン・小文字・パディングを受け付ける", () => {
    const expected = base32Decode("JBSWY3DPEE");
    expect(base32Decode("jbsw y3dp-ee==")).toEqual(expected);
  });

  it("使えない文字は拒否する", () => {
    expect(() => base32Decode("JBSW1088")).toThrow("INVALID_BASE32");
  });
});

describe("totpCode (RFC 6238 の検証値)", () => {
  // RFC 6238 Appendix B の SHA-1 の行。6桁に切り詰めて比較する。
  const cases: [seconds: number, code: string][] = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ];

  for (const [seconds, code] of cases) {
    it(`t=${seconds} で ${code}`, () => {
      expect(totpCode(RFC_SECRET, new Date(seconds * 1000))).toBe(code);
    });
  }
});

describe("verifyTotp", () => {
  const at = new Date(1111111109 * 1000);

  it("その時刻のコードを受け入れる", () => {
    expect(verifyTotp(RFC_SECRET, "081804", at)).toBe(true);
  });

  it("区切りや空白が入っていても通る", () => {
    expect(verifyTotp(RFC_SECRET, " 081 804 ", at)).toBe(true);
  });

  it("1つ前の枠のコードも通す（時計のずれを吸収）", () => {
    const prev = totpCode(RFC_SECRET, new Date((1111111109 - 30) * 1000));
    expect(verifyTotp(RFC_SECRET, prev, at)).toBe(true);
  });

  it("2つ前の枠は通さない", () => {
    const old = totpCode(RFC_SECRET, new Date((1111111109 - 90) * 1000));
    expect(verifyTotp(RFC_SECRET, old, at)).toBe(false);
  });

  it("違うコードは通さない", () => {
    expect(verifyTotp(RFC_SECRET, "000000", at)).toBe(false);
  });

  it("桁数違い・数字以外は通さない", () => {
    expect(verifyTotp(RFC_SECRET, "08180", at)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "0818040", at)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "abcdef", at)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "", at)).toBe(false);
  });

  it("壊れた鍵でも例外を投げずに false", () => {
    expect(verifyTotp("これは鍵ではない", "081804", at)).toBe(false);
  });
});

describe("generateTotpSecret", () => {
  it("Base32 として読める32文字", () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(s)).toHaveLength(20);
  });

  it("毎回ちがう", () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
});

describe("totpUri", () => {
  it("認証アプリが読める形式になる", () => {
    const uri = totpUri("JBSWY3DPEE", "a@example.com");
    expect(uri).toContain("otpauth://totp/Tsumiki:a%40example.com?");
    expect(uri).toContain("secret=JBSWY3DPEE");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });

  it("記号を含むアドレスでもラベルが壊れない", () => {
    // エンコードしないと ? や # から先がクエリ扱いになり、別物として登録される。
    const uri = totpUri("JBSWY3DPEE", "a+b?c#d@example.com");
    expect(uri).toContain("a%2Bb%3Fc%23d%40example.com");
  });
});

describe("recovery codes", () => {
  it("既定で10個、重複しない", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("読みやすい区切り付きの形式", () => {
    for (const c of generateRecoveryCodes(3)) {
      expect(c).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    }
  });

  it("入力の表記ゆれを吸収する", () => {
    expect(normalizeRecoveryCode(" ab2c-3d4e ")).toBe("AB2C3D4E");
  });
});
