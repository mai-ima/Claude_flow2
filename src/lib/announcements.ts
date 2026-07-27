import "server-only";
import { cache } from "react";
import { db } from "./db";

/**
 * いま出すべき告知バナー。
 * 掲出中の中でいちばん新しいものを1つだけ返す（帯を積み上げない）。
 */
export const activeBanner = cache(async (tier: string) => {
  try {
    const now = new Date();
    const rows = await db.announcementBanner.findMany({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { startsAt: "desc" },
      take: 5,
    });
    const match = rows.find((b) => {
      if (!Array.isArray(b.tiers) || b.tiers.length === 0) return true;
      return b.tiers.includes(tier);
    });
    if (!match) return null;
    return {
      id: match.id,
      message: match.message,
      href: match.href,
      tone: match.tone as "INFO" | "WARNING" | "CRITICAL",
    };
  } catch {
    return null;
  }
});
