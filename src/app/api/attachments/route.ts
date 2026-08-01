import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveLedgerId, requireOwnRecordOrEditor } from "@/lib/ledger-access";
import { db } from "@/lib/db";
import { isAttachmentEnabled } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  storeAttachment,
  removeAttachment,
  isAllowedMime,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TXN,
} from "@/lib/blob";

/**
 * レシートなどの添付。
 *
 * Server Action ではなくルートにしてある。ファイルの本体を送るため、
 * multipart で受けたほうが素直で、大きさの検査も入り口で終わる。
 *
 * 中身は読まない（OCR はしない）。後から見返すために預かるだけ。
 */

/** 添付を1件足す。 */
export async function POST(req: Request) {
  if (!isAttachmentEnabled) {
    return NextResponse.json(
      { message: "ファイルの預かり先が設定されていないため、添付は利用できません。" },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  if (user.impersonatedBy) {
    return NextResponse.json(
      { message: "他のユーザーとして閲覧中は、変更操作を行えません。" },
      { status: 403 },
    );
  }

  // 置き場の費用が読めなくなるため、連続の投入は絞る。
  const rl = await rateLimit(`attach:${user.id}`, 30, 300, { memoryFallback: true });
  if (!rl.ok) {
    return NextResponse.json(
      { message: "続けて送りすぎです。少し時間をおいてお試しください。" },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "ファイルを受け取れませんでした。" }, { status: 400 });
  }

  const transactionId = String(form.get("transactionId") ?? "");
  const file = form.get("file");
  if (!transactionId || !(file instanceof File)) {
    return NextResponse.json({ message: "ファイルが選ばれていません。" }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ message: "中身が空のファイルです。" }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { message: `ファイルは ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB までです。` },
      { status: 413 },
    );
  }
  // 種類は入り口で絞る。実行できる形式を預かると、開いた人の手元で動く。
  if (!isAllowedMime(file.type)) {
    return NextResponse.json(
      { message: "写真（JPEG・PNG・WebP・HEIC）と PDF のみ添付できます。" },
      { status: 415 },
    );
  }

  const ledgerId = await getActiveLedgerId(user.id);
  const txn = await db.transaction.findUnique({ where: { id: transactionId } });
  if (!txn || txn.ledgerId !== ledgerId) {
    return NextResponse.json({ message: "対象の記録が見つかりません。" }, { status: 404 });
  }
  try {
    // 記録を直せる人だけが添付できる。SELF_EDITOR は自分の記録に限る。
    await requireOwnRecordOrEditor(ledgerId, user.id, txn.createdByUserId);
  } catch {
    return NextResponse.json(
      { message: "この記録に添付する権限がありません。" },
      { status: 403 },
    );
  }

  const count = await db.attachment.count({ where: { transactionId } });
  if (count >= MAX_ATTACHMENTS_PER_TXN) {
    return NextResponse.json(
      { message: `1件の記録に添付できるのは ${MAX_ATTACHMENTS_PER_TXN} 個までです。` },
      { status: 409 },
    );
  }

  try {
    const stored = await storeAttachment(ledgerId, transactionId, file);
    const row = await db.attachment.create({
      data: {
        transactionId,
        url: stored.url,
        pathname: stored.pathname,
        // 元の名前は表示にだけ使う。置き場の名前とは別（推測されないようにする）。
        name: file.name.slice(0, 120) || "添付ファイル",
        mimeType: file.type,
        size: file.size,
      },
    });
    return NextResponse.json({
      id: row.id,
      url: row.url,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
    });
  } catch (err) {
    logger.error("attachment upload failed", err, { transactionId });
    return NextResponse.json(
      { message: "アップロードに失敗しました。時間をおいてお試しください。" },
      { status: 500 },
    );
  }
}

/** 添付を1件消す。 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  if (user.impersonatedBy) {
    return NextResponse.json(
      { message: "他のユーザーとして閲覧中は、変更操作を行えません。" },
      { status: 403 },
    );
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "対象が指定されていません。" }, { status: 400 });

  const ledgerId = await getActiveLedgerId(user.id);
  const row = await db.attachment.findUnique({
    where: { id },
    include: { transaction: { select: { ledgerId: true, createdByUserId: true } } },
  });
  if (!row || row.transaction.ledgerId !== ledgerId) {
    return NextResponse.json({ message: "対象が見つかりません。" }, { status: 404 });
  }
  try {
    await requireOwnRecordOrEditor(ledgerId, user.id, row.transaction.createdByUserId);
  } catch {
    return NextResponse.json({ message: "削除する権限がありません。" }, { status: 403 });
  }

  // 置き場から消せなくても行は消す。残すと開けないリンクが並び続ける。
  await removeAttachment(row.url);
  await db.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
