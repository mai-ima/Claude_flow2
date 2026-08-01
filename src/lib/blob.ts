import "server-only";
import { put, del } from "@vercel/blob";
import { env, isAttachmentEnabled } from "./env";
import { logger } from "./logger";

/**
 * 添付ファイルの置き場。
 *
 * 置き場が未設定でも、このモジュールを読み込むだけでは何も起きない。
 * env が無いだけでアプリ全体が落ちる作りにはしない（収益化キーと同じ扱い）。
 */

/** 1件あたりの上限。レシートの写真なら十分で、置き場の費用も読める。 */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** 1つの記録に付けられる数。 */
export const MAX_ATTACHMENTS_PER_TXN = 5;

/**
 * 受け付ける種類。
 *
 * 画像と PDF だけにする。実行できる形式を預かると、リンクを開いた人の
 * 手元で動いてしまう。SVG も外す（中にスクリプトを書ける）。
 */
export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

/** 拡張子。置き場に元のファイル名をそのまま置かないために使う。 */
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export interface StoredFile {
  url: string;
  pathname: string;
}

/**
 * ファイルを預ける。
 *
 * 置き場での名前は自分で決める。利用者が付けた名前をそのまま使うと、
 * 名前から中身が推測できてしまううえ、別の帳簿と衝突する。
 * `addRandomSuffix` で当てずっぽうのURLアクセスも防ぐ。
 */
export async function storeAttachment(
  ledgerId: string,
  transactionId: string,
  file: File,
): Promise<StoredFile> {
  if (!isAttachmentEnabled) throw new Error("ATTACHMENT_DISABLED");
  const ext = EXT[file.type] ?? "bin";
  const key = `ledgers/${ledgerId}/${transactionId}/${Date.now()}.${ext}`;
  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/**
 * ファイルを消す。
 *
 * 置き場から消せなくても、データベースの行は消す。残しておくと画面に
 * 開けないリンクが並び続ける。消し漏れはログに残す。
 */
export async function removeAttachment(url: string): Promise<void> {
  if (!isAttachmentEnabled) return;
  try {
    await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    logger.error("attachment delete failed", err, { url });
  }
}
