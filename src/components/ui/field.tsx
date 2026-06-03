import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

// フォントは 16px 以上に固定（iOS Safari のフォーカス時オートズームを回避）。
const base =
  "w-full rounded-xl border border-border-subtle bg-surface-1 px-3.5 text-[16px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/40 transition";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-[13px] font-medium text-text-secondary">{label}</span>
      )}
      {children}
      {error ? (
        <span className="block text-[12px] text-expense">{error}</span>
      ) : hint ? (
        <span className="block text-[12px] text-text-tertiary">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "py-2.5 min-h-[88px]", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "h-11 pr-9 appearance-none", className)} {...props} />;
}
