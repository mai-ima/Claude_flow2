/**
 * User-Agent 文字列から、利用者が自分の端末だと判別できる短い名前を作る。
 *
 * 判定は全て単純な文字列一致（ルールベース）。外部サービスも辞書も使わない。
 * 目的は「これは自分のiPhoneだ」と分かること一点なので、正確な製品名や
 * バージョンまでは追わない。判別できなければ「不明な端末」を返す。
 */

const BROWSERS: [pattern: string, name: string][] = [
  // Edge/Chrome/Safari の順は重要。Edge は Chrome を、Chrome は Safari を
  // それぞれ UA に含むため、限定的なものから先に判定する。
  ["Edg/", "Edge"],
  ["OPR/", "Opera"],
  ["Firefox/", "Firefox"],
  ["CriOS/", "Chrome"],
  ["FxiOS/", "Firefox"],
  ["Chrome/", "Chrome"],
  ["Safari/", "Safari"],
];

const PLATFORMS: [pattern: string, name: string][] = [
  ["iPhone", "iPhone"],
  ["iPad", "iPad"],
  ["Android", "Android"],
  ["Macintosh", "Mac"],
  ["Windows", "Windows"],
  ["Linux", "Linux"],
];

function pick(ua: string, table: [string, string][]): string | null {
  for (const [pattern, name] of table) {
    if (ua.includes(pattern)) return name;
  }
  return null;
}

/** 「iPhone の Safari」のような短い端末名。判別できなければ「不明な端末」。 */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "不明な端末";
  const platform = pick(userAgent, PLATFORMS);
  const browser = pick(userAgent, BROWSERS);
  if (platform && browser) return `${platform} の ${browser}`;
  if (platform) return platform;
  if (browser) return browser;
  return "不明な端末";
}
