import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em] select-none transition-all duration-200 ease-spring active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1",
  {
    variants: {
      variant: {
        filled: "bg-accent-solid text-white hover:bg-accent-solid-hover shadow-sm",
        tinted:
          "bg-accent/10 text-accent hover:bg-accent/15 dark:bg-accent/20 dark:hover:bg-accent/25",
        plain: "text-accent hover:bg-accent/8",
        gray: "bg-surface-2 text-text-primary hover:bg-surface-3 border border-border-subtle",
        destructive: "bg-expense-solid text-white hover:opacity-90 shadow-sm",
        ghost: "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
      },
      // 見た目の高さは保ちつつ、擬似要素で当たり判定を 44px（Apple HIG 最小）へ広げる。
      size: {
        sm: "h-9 px-4 text-[13px] rounded-full relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']",
        md: "h-11 px-5 text-[15px] rounded-[14px]",
        lg: "h-[54px] px-7 text-[17px] rounded-2xl",
        icon: "h-10 w-10 rounded-full relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
      },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "filled", size: "md" },
  },
);

type CommonProps = VariantProps<typeof buttonVariants> & { className?: string };

export function Button({
  variant,
  size,
  full,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & CommonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, full }), className)} {...props} />
  );
}

export function ButtonLink({
  variant,
  size,
  full,
  className,
  href,
  ...props
}: React.ComponentProps<typeof Link> & CommonProps) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
