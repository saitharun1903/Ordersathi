import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-faint shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-colors hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/12 disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-bad aria-[invalid=true]:focus:ring-bad/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-9", className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(control, "h-9 appearance-none pr-8")} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-ink-2", className)} {...props} />;
}

/** Label + control + hint/error, wired up with aria-describedby. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
  optional,
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  optional?: boolean;
  children: React.ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-faint">optional</span>}
      </Label>
      {React.cloneElement(children, { "aria-invalid": !!error || undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-bad" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
