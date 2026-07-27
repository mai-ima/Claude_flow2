import { z } from "zod";

/**
 * 管理権限の粒度。
 *
 * これまでは isAdmin の真偽だけで、閲覧させたいだけの相手にも
 * ユーザー削除まで含む全権限を渡すことになっていた。
 */
export const AdminRole = z.enum(["NONE", "READONLY", "SUPPORT", "SUPER"]);
export type AdminRole = z.infer<typeof AdminRole>;

const RANK: Record<AdminRole, number> = {
  NONE: 0,
  READONLY: 1,
  SUPPORT: 2,
  SUPER: 3,
};

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  NONE: "権限なし",
  READONLY: "閲覧のみ",
  SUPPORT: "サポート",
  SUPER: "全権",
};

export const ADMIN_ROLE_DESCRIPTION: Record<AdminRole, string> = {
  NONE: "管理画面を開けません。",
  READONLY: "管理画面を見られますが、変更はできません。",
  SUPPORT: "閲覧に加えて、お知らせの配信ができます。",
  SUPER: "プラン変更・権限付与・削除を含むすべての操作ができます。",
};

export function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === "string" && v in RANK;
}

/** 指定の権限を満たすか。 */
export function hasAdminRole(actual: string, required: AdminRole): boolean {
  const a = isAdminRole(actual) ? actual : "NONE";
  return RANK[a] >= RANK[required];
}

/**
 * 旧 isAdmin との橋渡し。
 * 移行中は両方が生きているため、どちらか一方だけを見て判断しない。
 */
export function effectiveAdminRole(adminRole: string, isAdmin: boolean): AdminRole {
  if (isAdminRole(adminRole) && adminRole !== "NONE") return adminRole;
  return isAdmin ? "SUPER" : "NONE";
}
