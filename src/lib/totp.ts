import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 時刻ベースのワンタイムパスワード（RFC 6238 / TOTP）。
 *
 * 外部ライブラリを入れずに実装する。認証に関わる部分の依存を増やしたくないのと、
 * 必要なのは HMAC-SHA1 と Base32 だけで、どちらも標準の crypto で足りるため。
 *
 * Google Authenticator などが既定で使う設定に合わせる:
 * SHA-1 / 6桁 / 30秒。ここを変えると多くのアプリで読めなくなる。
 */

const DIGITS = 6;
const PERIOD_SEC = 30;
/** 前後1枠を許容する。端末の時計のずれと入力にかかる時間を吸収する。 */
const WINDOW = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Base32（RFC 4648・パディング無し）へ。認証アプリに渡す鍵の形式。 */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Base32 から復元。空白とハイフン、小文字、末尾の = は受け付ける。 */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("INVALID_BASE32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 新しい共有鍵。20バイト = SHA-1 のブロック長に合わせた一般的な長さ。 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** 指定の時刻枠に対するコード。 */
function codeForCounter(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  // カウンタは64bit ビッグエンディアン。JS の number では上位が扱えないので分けて書く。
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", secret).update(buf).digest();
  // 動的切り詰め（RFC 4226 5.4）。末尾4bitが取り出し位置を指す。
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** いまの時刻のコード。表示・テスト用。 */
export function totpCode(secret: string, at: Date = new Date()): string {
  return codeForCounter(base32Decode(secret), Math.floor(at.getTime() / 1000 / PERIOD_SEC));
}

/**
 * 入力されたコードが正しいか。
 *
 * 桁数が違う・数字でない場合は照合するまでもなく false。
 * 比較は長さを揃えたうえで timingSafeEqual を使う（総当たりの際に
 * 一致した桁数が応答時間から漏れないようにする）。
 */
export function verifyTotp(secret: string, input: string, at: Date = new Date()): boolean {
  const cleaned = input.replace(/[\s-]/g, "");
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(cleaned)) return false;

  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(at.getTime() / 1000 / PERIOD_SEC);
  const given = Buffer.from(cleaned);
  let matched = false;
  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const expected = Buffer.from(codeForCounter(key, counter + drift));
    // 一致してもループを抜けない。試した回数を一定に保つ。
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      matched = true;
    }
  }
  return matched;
}

/**
 * 認証アプリに読み込ませる otpauth URI。
 * label と issuer は URI に埋める前に必ずエンコードする（メールアドレスに
 * 含まれる記号がそのまま入ると別のアカウントとして登録される）。
 */
export function totpUri(secret: string, account: string, issuer = "Tsumiki"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SEC),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** 認証アプリを失ったとき用の使い切りコード。 */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    // 読み書きしやすいよう4文字ずつ区切る。
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

/** 入力された復旧コードの表記ゆれを吸収する。 */
export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}
