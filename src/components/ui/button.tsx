import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] disabled:bg-brand/40",
  volt: "bg-volt text-ink hover:bg-volt-hover shadow-[inset_0_-2px_0_rgb(0_0_0/0.1)] disabled:opacity-50",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink/45 disabled:text-faint",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink disabled:text-faint",
  danger: "bg-surface text-bad border border-bad-line hover:bg-bad-soft disabled:opacity-50",
  warn: "bg-warn-soft text-warn border border-warn-line hover:bg-[#ffe7d1]",
  link: "text-ink underline decoration-volt decoration-2 underline-offset-4 hover:decoration-ink px-0 h-auto",
} as const;

const sizes = {
  xs: "h-7 px-2 text-xs gap-1 rounded-md",
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-[10px]",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-md",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, asChild, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[color,background-color,border-color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="size-4" />}
          {children}
        </>
      )}
    </Comp>
  );
});
