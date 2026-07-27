import "server-only";
import { cache } from "react";
import { db } from "./db";

/**
 * システム設定。コードに直書きしていた定数を管理画面から変えられるようにする。
 *
 * 既定値はここに持つ。DB に行が無くても（初期状態でも、DB が落ちていても）
 * これまでと同じ値で動き続ける。
 */
export const SETTING_DEFAULTS = {
  /** 既読通知の保持日数。超えたものは定期削除する。 */
  notificationRetentionDays: 90,
  /** 無駄サブスクと判定する未利用日数。 */
  wasteThresholdDays: 90,
  /** メンテナンスモード。true の間、管理者以外は静的な案内画面へ。 */
  maintenanceMode: false,
  /** メンテナンス中に表示する文面。 */
  maintenanceMessage: "ただいまメンテナンス中です。しばらくお待ちください。",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = { [K in SettingKey]: (typeof SETTING_DEFAULTS)[K] };

function coerce<K extends SettingKey>(key: K, raw: unknown): Settings[K] {
  const fallback = SETTING_DEFAULTS[key];
  if (typeof fallback === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return (Number.isFinite(n) ? n : fallback) as Settings[K];
  }
  if (typeof fallback === "boolean") {
    return (typeof raw === "boolean" ? raw : fallback) as Settings[K];
  }
  return (typeof raw === "string" && raw.length > 0 ? raw : fallback) as Settings[K];
}

/**
 * 設定の一括読み込み。リクエスト内で1回だけ引く。
 * 失敗しても既定値で動かす（設定テーブルの不調でアプリを止めない）。
 */
export const loadSettings = cache(async (): Promise<Settings> => {
  const result = { ...SETTING_DEFAULTS } as Settings;
  try {
    const rows = await db.systemSetting.findMany();
    for (const row of rows) {
      if (row.key in SETTING_DEFAULTS) {
        const k = row.key as SettingKey;
        // @ts-expect-error 動的キーへの代入。coerce が型を揃えている。
        result[k] = coerce(k, row.value);
      }
    }
  } catch {
    // 既定値のまま返す。
  }
  return result;
});
