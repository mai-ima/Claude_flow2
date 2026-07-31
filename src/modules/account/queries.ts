import "server-only";
import { db } from "@/lib/db";
import { currentSessionToken } from "@/lib/auth";
import { describeDevice } from "@/lib/user-agent";

export interface SessionRow {
  id: string;
  device: string;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  /** 今見ているブラウザのセッションかどうか。 */
  isCurrent: boolean;
  /** 管理者が閲覧のために発行したセッションか。 */
  isImpersonation: boolean;
}

/**
 * ログイン中の端末一覧。新しく使われたものから並べる。
 * 期限切れは表示しない（利用者から見れば既に切れているため）。
 */
export async function listSessions(userId: string): Promise<SessionRow[]> {
  const [rows, current] = await Promise.all([
    db.session.findMany({
      where: { userId, expires: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      take: 50,
    }),
    currentSessionToken(),
  ]);

  return rows.map((s) => ({
    id: s.id,
    device: describeDevice(s.userAgent),
    ip: s.ip,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    isCurrent: current !== null && s.sessionToken === current,
    isImpersonation: s.impersonatedBy !== null,
  }));
}
