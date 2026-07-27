"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/safe-action";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { writeAudit } from "./audit";

/** 機能フラグの登録・更新。 */
export const upsertFlag = adminAction(
  "SUPER",
  z.object({
    key: z
      .string()
      .trim()
      .min(1, "キーを入力してください。")
      .regex(/^[a-z0-9_]+$/, "キーは英小文字・数字・アンダースコアで入力してください。"),
    label: z.string().trim().min(1, "表示名を入力してください。"),
    description: z.string().trim().optional(),
    enabled: z.coerce.boolean(),
    rolloutPct: z.coerce.number().int().min(0).max(100),
    tiers: z.array(z.enum(["FREE", "PLUS", "PRO"])).optional(),
  }),
  async (input, user) => {
    const before = await db.featureFlag.findUnique({ where: { key: input.key } });
    const data = {
      label: input.label,
      description: input.description?.trim() || null,
      enabled: input.enabled,
      rolloutPct: input.rolloutPct,
      tiers: input.tiers && input.tiers.length > 0 ? input.tiers : undefined,
    };
    await db.featureFlag.upsert({
      where: { key: input.key },
      create: { key: input.key, ...data },
      update: data,
    });
    await writeAudit({
      actor: user,
      action: "FEATURE_FLAG_CHANGE",
      targetType: "SYSTEM",
      targetId: input.key,
      targetLabel: input.label,
      before: before
        ? { enabled: before.enabled, rolloutPct: before.rolloutPct, tiers: before.tiers }
        : undefined,
      after: { enabled: input.enabled, rolloutPct: input.rolloutPct, tiers: input.tiers },
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  },
);

export const deleteFlag = adminAction(
  "SUPER",
  z.object({ key: z.string() }),
  async (input, user) => {
    await db.featureFlag.delete({ where: { key: input.key } });
    await writeAudit({
      actor: user,
      action: "FEATURE_FLAG_CHANGE",
      targetType: "SYSTEM",
      targetId: input.key,
      targetLabel: `${input.key} を削除`,
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  },
);

/**
 * システム設定の更新。
 * 既定値に無いキーは受け付けない（任意の値を書き込めるテーブルにしない）。
 */
export const updateSetting = adminAction(
  "SUPER",
  z.object({
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  async (input, user) => {
    if (!(input.key in SETTING_DEFAULTS)) throw new Error("NOT_FOUND");
    const before = await db.systemSetting.findUnique({ where: { key: input.key } });
    await db.systemSetting.upsert({
      where: { key: input.key },
      create: { key: input.key, value: input.value },
      update: { value: input.value },
    });
    await writeAudit({
      actor: user,
      action: "SYSTEM_SETTING_CHANGE",
      targetType: "SYSTEM",
      targetId: input.key,
      before: before ? { value: before.value } : undefined,
      after: { value: input.value },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);
