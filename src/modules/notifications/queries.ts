import "server-only";
import { db } from "@/lib/db";

export function listNotifications(userId: string, limit = 12) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}
