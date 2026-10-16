import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0d5a45" />
      <path d="M9 16.5l4.2 4.2L23 11" stroke="#f6f4ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="23.5" cy="21.5" r="2.5" fill="#e3a43b" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        Order<span className="text-brand">Sathi</span>
      </span>
    </span>
  );
}
