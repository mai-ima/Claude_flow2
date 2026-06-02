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

/** 色名 → Tailwind グラデーション（サブスク・スタック等のカード用）。 */
export const GRADIENTS: Record<string, string> = {
  blue: "from-[#007aff] to-[#0a84ff]",
  purple: "from-[#5856d6] to-[#7d7aff]",
  indigo: "from-[#5856d6] to-[#7d7aff]",
  pink: "from-[#ff2d55] to-[#ff6482]",
  teal: "from-[#30b0c7] to-[#40c8e0]",
  green: "from-[#34c759] to-[#30d158]",
  mint: "from-[#00c7be] to-[#40e0d0]",
  orange: "from-[#ff9500] to-[#ffb340]",
  red: "from-[#ff3b30] to-[#ff6b60]",
  yellow: "from-[#ffcc00] to-[#ffd60a]",
  cyan: "from-[#32ade6] to-[#64d2ff]",
  gray: "from-[#8e8e93] to-[#aeaeb2]",
};

export function gradientOf(name: string): string {
  return GRADIENTS[name] ?? GRADIENTS.gray;
}
