import "server-only";
import { db } from "@/lib/db";
import type { FeedbackStatus } from "./schema";

/**
 * 届いた報告の一覧（新しい順）。
 * 未読を先に見たいことが多いので、状態で絞れるようにする。
 */
export async function listFeedback(status?: FeedbackStatus, limit = 100) {
  return db.feedback.findMany({
    where: status ? { status } : undefined,
    include: {
      // 送り主は名前とメールだけ。User 全体を引くと passwordHash まで載る。
      user: { select: { id: true, name: true, email: true } },
      handledBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** 状態ごとの件数。管理のトップに出す。 */
export async function feedbackCounts() {
  const rows = await db.feedback.groupBy({ by: ["status"], _count: { _all: true } });
  const map = new Map(rows.map((r) => [r.status, r._count._all]));
  return {
    new: map.get("NEW") ?? 0,
    reading: map.get("READING") ?? 0,
    done: map.get("DONE") ?? 0,
    wontfix: map.get("WONTFIX") ?? 0,
    total: rows.reduce((s, r) => s + r._count._all, 0),
  };
}

/** 自分が送った報告（送信後に「届いている」ことを確かめられるように）。 */
export async function myFeedback(userId: string, limit = 20) {
  return db.feedback.findMany({
    where: { userId },
    select: { id: true, kind: true, body: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
