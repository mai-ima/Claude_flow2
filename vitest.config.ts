import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * 純ロジック(node)とUI(jsdom)を1回の `vitest run` で両方走らせる。
 *
 * 以前は include が `src/**\/*.test.ts` のみ、environment も node 固定だったため、
 * `.test.tsx` が1件も実行されず、jsdom / @testing-library / plugin-react の
 * 依存が入っているのに UI の回帰をまったく検知できていなかった。
 *
 * タイムゾーン: サーバーを Asia/Tokyo に固定している（src/instrumentation.ts）ため、
 * テストも同条件で走らせないと「今月/今日」まわりのずれを取り逃す。
 */
process.env.TZ ??= "Asia/Tokyo";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "logic",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup-ui.ts"],
        },
      },
    ],
  },
});
