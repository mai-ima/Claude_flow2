import "server-only";
import { db } from "@/lib/db";
import type { FeedbackKind, FeedbackStatus } from "./schema";

export interface FeedbackFilter {
  status?: FeedbackStatus;
  kind?: FeedbackKind;
  /** 本文・返信先・送信元の画面をまとめて探す。 */
  q?: string;
  limit?: number;
}

/**
 * 届いた報告の一覧（新しい順）。
 *
 * 絞り込みはデータベース側で行う。件数が増えたあとに画面側で
 * 絞ると、取得した100件の中だけを探すことになり、
 * 「あるはずの報告が出てこない」という分かりにくい形で壊れる。
 */
export async function listFeedback(filter: FeedbackFilter | FeedbackStatus = {}, limitArg = 100) {
  // 状態だけを渡していた頃の書き方も受ける。
  const f: FeedbackFilter =
    typeof filter === "string" ? { status: filter, limit: limitArg } : filter;
  const q = f.q?.trim();

  return db.feedback.findMany({
    where: {
      ...(f.status ? { status: f.status } : {}),
      ...(f.kind ? { kind: f.kind } : {}),
      ...(q
        ? {
            OR: [
              { body: { contains: q, mode: "insensitive" as const } },
              { adminNote: { contains: q, mode: "insensitive" as const } },
              { contactEmail: { contains: q, mode: "insensitive" as const } },
              { fromPath: { contains: q, mode: "insensitive" as const } },
              { user: { email: { contains: q, mode: "insensitive" as const } } },
              { user: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: {
      // 送り主は名前とメールだけ。User 全体を引くと passwordHash まで載る。
      user: { select: { id: true, name: true, email: true } },
      handledBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(f.limit ?? 100, 300),
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

/**
 * 未対応の件数。管理コンソールの見出しに出す。
 * 「未読 + 確認中」を手つかずとみなす（見送りと対応済みは片付いている）。
 */
export async function openFeedbackCount(): Promise<number> {
  return db.feedback.count({ where: { status: { in: ["NEW", "READING"] } } });
}

/**
 * 自分が送った報告。
 *
 * 送りっぱなしで何も返らないと、次から送ってもらえなくなる。
 * 状態と返信をそのまま見せる。内部メモ（adminNote）は含めない。
 */
export async function myFeedback(userId: string, limit = 30) {
  return db.feedback.findMany({
    where: { userId },
    select: {
      id: true,
      kind: true,
      body: true,
      status: true,
      fromPath: true,
      replyBody: true,
      repliedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * 自分が送った件数と、返信が付いた件数。
 * 設定の入口に「返信があります」と出すために使う。
 * 「読んだかどうか」は持たない。読了の管理を足すほどの数にはならず、
 * 新着の合図はアプリ内通知が担っている。
 */
export async function myFeedbackCounts(userId: string) {
  const [total, replied] = await Promise.all([
    db.feedback.count({ where: { userId } }),
    db.feedback.count({ where: { userId, replyBody: { not: null } } }),
  ]);
  return { total, replied };
}
