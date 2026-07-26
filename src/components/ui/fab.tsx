import { PlusIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * 画面右下に固定する追加ボタン。各一覧画面で同じ実装が重複していたため共通化した。
 * 位置は viewport 基準。祖先に transform が付くと基準がずれるため、
 * ページ遷移アニメーションは fill-mode: backwards で終了時に transform を残さない
 * （src/app/globals.css の .page-enter を参照）。
 */
export function Fab({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent-solid text-white shadow-lg transition duration-[var(--dur-1)] ease-spring hover:bg-accent-solid-hover active:scale-95 md:bottom-8 md:right-8",
        className,
      )}
    >
      {children ?? <PlusIcon size={26} />}
    </button>
  );
}
