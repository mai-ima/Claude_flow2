import { z } from "zod";

/**
 * SQLite は Prisma enum 非対応のため、列挙はここを単一ソースとして
 * String 列 + Zod + TS union で担保する。Postgres 移行時もそのまま使える。
 */

export const TxnType = z.enum(["INCOME", "EXPENSE"]);
export type TxnType = z.infer<typeof TxnType>;

export const BillingCycle = z.enum(["MONTHLY", "YEARLY", "WEEKLY", "QUARTERLY"]);
export type BillingCycle = z.infer<typeof BillingCycle>;

export const SubStatus = z.enum(["ACTIVE", "PAUSED", "CANCELED", "TRIAL"]);
export type SubStatus = z.infer<typeof SubStatus>;

export const BudgetPeriod = z.enum(["MONTHLY", "YEARLY"]);
export type BudgetPeriod = z.infer<typeof BudgetPeriod>;

export const PlanTier = z.enum(["FREE", "PLUS", "PRO"]);
export type PlanTier = z.infer<typeof PlanTier>;

export const LedgerType = z.enum(["PERSONAL", "POD"]);
export type LedgerType = z.infer<typeof LedgerType>;

export const MemberRole = z.enum(["OWNER", "EDITOR", "VIEWER"]);
export type MemberRole = z.infer<typeof MemberRole>;

export const PaymentMethodType = z.enum(["CARD", "BANK", "CASH", "EMONEY"]);
export type PaymentMethodType = z.infer<typeof PaymentMethodType>;

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  MONTHLY: "月額",
  YEARLY: "年額",
  WEEKLY: "週額",
  QUARTERLY: "四半期",
};

export const STATUS_LABEL: Record<SubStatus, string> = {
  ACTIVE: "利用中",
  PAUSED: "一時停止",
  CANCELED: "解約済み",
  TRIAL: "無料体験",
};

export const PAYMENT_TYPE_LABEL: Record<PaymentMethodType, string> = {
  CARD: "クレジットカード",
  BANK: "銀行口座",
  CASH: "現金",
  EMONEY: "電子マネー",
};
