import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * iOS「インセットグループリスト」風のコンテナ。設定や詳細画面で使う。
 * 角丸カードの中に、ヘアラインで仕切られた行を並べる。
 */
export function ListGroup({
  title,
  footer,
  className,
  bodyClassName,
  padded = false,
  children,
}: {
  title?: string;
  footer?: string;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <h2 className="px-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
          {title}
        </h2>
      )}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border-subtle bg-surface-1",
          padded && "p-5",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && <p className="px-4 text-[12px] leading-relaxed text-text-tertiary">{footer}</p>}
    </section>
  );
}

interface RowProps {
  icon?: ReactNode;
  iconBg?: string;
  label: ReactNode;
  sublabel?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

function RowInner({ icon, iconBg, label, sublabel, value, trailing, chevron }: RowProps) {
  return (
    <>
      {icon && (
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-white",
            iconBg ?? "bg-accent",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-text-primary">{label}</span>
        {sublabel && <span className="block truncate text-[12px] text-text-tertiary">{sublabel}</span>}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-[15px] text-text-secondary tabular-nums">{value}</span>
      )}
      {trailing}
      {chevron && <ChevronRightIcon size={17} className="shrink-0 text-text-tertiary" />}
    </>
  );
}

const ROW = "flex items-center gap-3 px-4 py-3 border-t border-border-subtle first:border-t-0";
const TAP = "transition-colors hover:bg-surface-2 active:bg-surface-3";

export function ListRow(props: RowProps) {
  const { href, onClick, className } = props;
  if (href) {
    return (
      <Link href={href} className={cn(ROW, TAP, className)}>
        <RowInner {...props} chevron={props.chevron ?? true} />
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(ROW, TAP, "w-full text-left", className)}>
        <RowInner {...props} />
      </button>
    );
  }
  return (
    <div className={cn(ROW, className)}>
      <RowInner {...props} />
    </div>
  );
}

/** 行内に任意コンテンツを置くラッパー（フォーム行など）。 */
export function ListItem({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3 border-t border-border-subtle first:border-t-0", className)} {...props} />;
}
