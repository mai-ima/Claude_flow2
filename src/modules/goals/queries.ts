import "server-only";
import { db } from "@/lib/db";

export function listGoals(ledgerId: string) {
  return db.goal.findMany({
    where: { ledgerId },
    orderBy: { createdAt: "asc" },
    include: {
      contributions: {
        orderBy: { occurredAt: "desc" },
        take: 6,
      },
    },
  });
}

/** 目標の積立履歴（新しい順）。ledgerId で越境を防止。 */
export async function goalContributions(ledgerId: string, goalId: string) {
  const goal = await db.goal.findUnique({ where: { id: goalId }, select: { ledgerId: true } });
  if (!goal || goal.ledgerId !== ledgerId) return [];
  return db.goalContribution.findMany({
    where: { goalId },
    orderBy: { occurredAt: "desc" },
  });
}
