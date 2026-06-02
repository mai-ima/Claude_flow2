import "server-only";
import { db } from "@/lib/db";

export function listGoals(ledgerId: string) {
  return db.goal.findMany({
    where: { ledgerId },
    orderBy: { createdAt: "asc" },
  });
}
