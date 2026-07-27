import "server-only";
import { db } from "@/lib/db";

export interface ReleaseSection {
  h: string;
  items: string[];
}

export interface ReleaseEntry {
  id: string;
  version: string;
  title: string;
  date: string;
  published: boolean;
  sections: ReleaseSection[];
}

/** Json 列を型のある形に整える。壊れた行があっても他を巻き込まない。 */
function toSections(raw: unknown): ReleaseSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    if (typeof s !== "object" || s === null) return [];
    const h = (s as { h?: unknown }).h;
    const items = (s as { items?: unknown }).items;
    if (typeof h !== "string" || !Array.isArray(items)) return [];
    return [{ h, items: items.filter((i): i is string => typeof i === "string") }];
  });
}

function toEntry(r: {
  id: string;
  version: string;
  title: string;
  releasedAt: Date;
  published: boolean;
  sections: unknown;
}): ReleaseEntry {
  return {
    id: r.id,
    version: r.version,
    title: r.title,
    date: `${r.releasedAt.getFullYear()}年${r.releasedAt.getMonth() + 1}月`,
    published: r.published,
    sections: toSections(r.sections),
  };
}

/**
 * 公開中のリリースノート（一般向け）。
 *
 * DB 未接続でもマーケティングページのビルドを通せるよう、失敗時は空で返す
 * （vercel-build は DATABASE_URL 未設定でも公開を進める作りになっている）。
 */
export async function publishedReleases(): Promise<ReleaseEntry[]> {
  try {
    const rows = await db.releaseNote.findMany({
      where: { published: true },
      orderBy: { releasedAt: "desc" },
    });
    return rows.map(toEntry);
  } catch {
    return [];
  }
}

/** 下書きを含む全件（管理画面向け）。 */
export async function allReleases(): Promise<ReleaseEntry[]> {
  const rows = await db.releaseNote.findMany({ orderBy: { releasedAt: "desc" } });
  return rows.map(toEntry);
}
