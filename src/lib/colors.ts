/** カテゴリ等の色名 → HEX。チャートとアイコン背景で共有（純関数・client/server 両用）。 */
export const PALETTE: Record<string, string> = {
  orange: "#ff9500",
  teal: "#30b0c7",
  indigo: "#5856d6",
  yellow: "#ffcc00",
  blue: "#007aff",
  cyan: "#32ade6",
  pink: "#ff2d55",
  red: "#ff3b30",
  purple: "#af52de",
  gray: "#8e8e93",
  green: "#34c759",
  mint: "#00c7be",
};

export function colorOf(name: string): string {
  return PALETTE[name] ?? PALETTE.gray;
}
