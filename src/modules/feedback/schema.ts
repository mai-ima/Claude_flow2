import { z } from "zod";

/**
 * 送るものの種類。
 * 「不具合」と「要望」を分けるのは、直す順番の判断が変わるため。
 */
export const FeedbackKind = z.enum(["BUG", "REQUEST", "OTHER"]);
export type FeedbackKind = z.infer<typeof FeedbackKind>;

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  BUG: "うまく動かない",
  REQUEST: "こうしてほしい",
  OTHER: "その他",
};

export const FeedbackStatus = z.enum(["NEW", "READING", "DONE", "WONTFIX"]);
export type FeedbackStatus = z.infer<typeof FeedbackStatus>;

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  NEW: "未読",
  READING: "確認中",
  DONE: "対応済み",
  WONTFIX: "見送り",
};

export const feedbackInput = z.object({
  kind: FeedbackKind,
  body: z
    .string()
    .trim()
    .min(5, "もう少しくわしくお書きください（5文字以上）。")
    .max(2000, "2000文字以内でお願いします。"),
  /** 返信がほしい場合の宛先。空なら返信しない。 */
  contactEmail: z
    .string()
    .trim()
    .email("メールアドレスの形式が正しくありません。")
    .optional()
    .or(z.literal("")),
  /** どの画面から送ったか。原因の切り分けに使う。 */
  fromPath: z.string().max(200).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackInput>;

/** 管理側の更新。 */
export const updateFeedbackInput = z.object({
  id: z.string(),
  status: FeedbackStatus,
  adminNote: z.string().max(2000).optional().nullable(),
});
export const deleteFeedbackInput = z.object({ id: z.string() });

/**
 * 送り主への返信。
 *
 * adminNote（内部メモ）とは別の入力にする。同じ欄を使い回すと、
 * 内部向けに書いた言葉がそのまま本人に届く事故がいつか起きる。
 */
export const replyFeedbackInput = z.object({
  id: z.string(),
  replyBody: z
    .string()
    .trim()
    .min(1, "返信の内容を入力してください。")
    .max(2000, "2000文字以内でお願いします。"),
  /** 返信と同時に対応状況も変える。既定は「対応済み」。 */
  status: FeedbackStatus.optional(),
});

/** まとめて状態を変える（未読を一気に片付けるため）。 */
export const bulkUpdateFeedbackInput = z.object({
  ids: z.array(z.string()).min(1).max(200),
  status: FeedbackStatus,
});
