import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-surface-1/50 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-text-tertiary">
          {icon}
        </div>
      )}
      <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="max-w-xs text-[14px] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
