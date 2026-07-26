const FALLBACK = "/billing";

export function safeNext(next?: string | null): string {
  if (!next) return FALLBACK;
  if (!next.startsWith("/")) return FALLBACK;
  if (next.length > 1 && (next[1] === "/" || next[1] === "\\")) return FALLBACK;
  return next;
}
