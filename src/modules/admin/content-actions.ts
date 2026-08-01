"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/safe-action";
import { writeAudit } from "@/lib/audit";
import { fromInputJST } from "@/lib/date";

const sections = z.array(
  z.object({
    h: z.string().trim().min(1, "見出しを入力してください。"),
    items: z.array(z.string().trim().min(1)).min(1, "項目を1つ以上入力してください。"),
  }),
);

/**
 * リリースノートの作成・更新。
 * バージョンを主キー代わりに使い、同じ番号なら上書きする。
 */
export const upsertReleaseNote = adminAction(
  "SUPER",
  z.object({
    version: z.string().trim().min(1, "バージョンを入力してください。"),
    title: z.string().trim().min(1, "表示名を入力してください。"),
    releasedAt: z.string(),
    published: z.coerce.boolean(),
    sections,
  }),
  async (input, user) => {
    const releasedAt = new Date(input.releasedAt);
    if (Number.isNaN(releasedAt.getTime())) throw new Error("INVALID_DATE");

    const before = await db.releaseNote.findUnique({ where: { version: input.version } });
    await db.releaseNote.upsert({
      where: { version: input.version },
      create: {
        version: input.version,
        title: input.title,
        releasedAt,
        published: input.published,
        sections: input.sections,
      },
      update: {
        title: input.title,
        releasedAt,
        published: input.published,
        sections: input.sections,
      },
    });
    await writeAudit({
      actor: user,
      action: "RELEASE_NOTE_PUBLISH",
      targetType: "SYSTEM",
      targetId: input.version,
      targetLabel: input.title,
      before: before ? { published: before.published } : undefined,
      after: { published: input.published },
    });
    revalidatePath("/changelog");
    revalidatePath("/admin/content");
    return { ok: true };
  },
);

export const deleteReleaseNote = adminAction(
  "SUPER",
  z.object({ version: z.string() }),
  async (input, user) => {
    await db.releaseNote.delete({ where: { version: input.version } });
    await writeAudit({
      actor: user,
      action: "RELEASE_NOTE_PUBLISH",
      targetType: "SYSTEM",
      targetId: input.version,
      targetLabel: `${input.version} を削除`,
    });
    revalidatePath("/changelog");
    revalidatePath("/admin/content");
    return { ok: true };
  },
);

/**
 * お知らせ配信。SYSTEM 通知を対象ユーザーへ作る。
 * 対象が広いので、送る前に件数を確かめられるようにしてある（previewBroadcast）。
 */
export const sendBroadcast = adminAction(
  "SUPPORT",
  z.object({
    title: z.string().trim().min(1, "件名を入力してください。").max(80),
    body: z.string().trim().min(1, "本文を入力してください。").max(500),
    href: z.string().trim().optional(),
    audience: z.enum(["ALL", "FREE", "PLUS", "PRO"]),
  }),
  async (input, user) => {
    const users = await db.user.findMany({
      where: {
        suspendedAt: null,
        ...(input.audience === "ALL" ? {} : { billing: { tier: input.audience } }),
      },
      select: {
        id: true,
        ownedLedgers: { where: { type: "PERSONAL" }, select: { id: true }, take: 1 },
      },
    });

    // 通知は帳簿に紐づく。個人帳簿を持たないユーザーには送れないため除く。
    const drafts = users
      .filter((u) => u.ownedLedgers.length > 0)
      .map((u) => ({
        userId: u.id,
        ledgerId: u.ownedLedgers[0].id,
        type: "SYSTEM",
        title: input.title,
        body: input.body,
        href: input.href?.trim() || "/",
      }));

    if (drafts.length > 0) await db.notification.createMany({ data: drafts });
    await writeAudit({
      actor: user,
      action: "BROADCAST_SEND",
      targetType: "SYSTEM",
      targetLabel: `${input.audience} / ${drafts.length}人`,
      after: { title: input.title, audience: input.audience, sent: drafts.length },
    });
    revalidatePath("/admin/content");
    return { sent: drafts.length };
  },
);

/** 告知バナーの登録。 */
export const upsertBanner = adminAction(
  "SUPPORT",
  z.object({
    id: z.string().optional(),
    message: z.string().trim().min(1, "文面を入力してください。").max(200),
    href: z.string().trim().optional(),
    tone: z.enum(["INFO", "WARNING", "CRITICAL"]),
    startsAt: z.string(),
    endsAt: z.string(),
  }),
  async (input, user) => {
    // 入力欄の値は「日本時間の日時」。new Date() だと実行環境の
    // 時間帯で読まれ、サーバーが UTC のときに9時間ずれる。
    const startsAt = fromInputJST(input.startsAt);
    const endsAt = fromInputJST(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new Error("INVALID_DATE");
    }
    if (endsAt <= startsAt) throw new Error("INVALID_PERIOD");

    const data = {
      message: input.message,
      href: input.href?.trim() || null,
      tone: input.tone,
      startsAt,
      endsAt,
    };
    if (input.id) await db.announcementBanner.update({ where: { id: input.id }, data });
    else await db.announcementBanner.create({ data });

    await writeAudit({
      actor: user,
      action: "SYSTEM_SETTING_CHANGE",
      targetType: "SYSTEM",
      targetLabel: "告知バナー",
      after: data,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

export const deleteBanner = adminAction(
  "SUPPORT",
  z.object({ id: z.string() }),
  async (input, user) => {
    await db.announcementBanner.delete({ where: { id: input.id } });
    await writeAudit({
      actor: user,
      action: "SYSTEM_SETTING_CHANGE",
      targetType: "SYSTEM",
      targetLabel: "告知バナーの削除",
    });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);
