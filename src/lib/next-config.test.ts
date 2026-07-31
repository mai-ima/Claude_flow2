import { describe, expect, it } from "vitest";
import { TRACING_EXCLUDES, RUNTIME_REQUIRED_PACKAGES } from "../../next.config";

/**
 * outputFileTracingExcludes の事故を止めるための検査。
 *
 * ここを間違えると、サーバー関数が起動時に Cannot find module で落ち、
 * 動的なページが全滅する。静的なページは CDN から出続けるので
 * 「トップは見えるのにログインだけ落ちる」形になり、原因に辿り着きにくい。
 * 実際にこれで本番が停止したため、設定そのものを検査対象にする。
 */

/** "node_modules/@swc/**" → "@swc" のように、対象パッケージ名を取り出す。 */
function excludedPackage(pattern: string): string | null {
  const m = pattern.match(/^node_modules\/(@[^/]+\/[^/*]+|@[^/*]+|[^/*]+)/);
  return m ? m[1] : null;
}

describe("outputFileTracingExcludes", () => {
  it("実行時に必要なパッケージを外していない", () => {
    const excluded = TRACING_EXCLUDES.map(excludedPackage).filter(
      (p): p is string => p !== null,
    );

    for (const required of RUNTIME_REQUIRED_PACKAGES) {
      // スコープ名だけの除外（@swc）も、完全一致（@swc/helpers）も両方拾う。
      const scope = required.split("/")[0];
      const hit = excluded.find((e) => e === required || e === scope);
      expect(hit, `${required} が除外されている（${hit}）`).toBeUndefined();
    }
  });

  it("除外は node_modules・public・scripts・テストに限る", () => {
    // src 配下を外すと、アプリのコードそのものが欠ける。
    for (const pattern of TRACING_EXCLUDES) {
      expect(
        /^(node_modules\/|public\/|scripts\/|\*\*\/\*\.test\.)/.test(pattern),
        `想定外の除外: ${pattern}`,
      ).toBe(true);
    }
  });

  it("実行時必須の一覧に @swc/helpers が入っている", () => {
    // 本番を止めた当事者。一覧から消えると検査が意味を失う。
    expect(RUNTIME_REQUIRED_PACKAGES).toContain("@swc/helpers");
  });
});
