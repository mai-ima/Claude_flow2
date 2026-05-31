import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind クラスを安全に結合（重複は後勝ちでマージ）。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
