import { useId } from "react";
import { cn } from "@/lib/utils";

/** "Smart Bubble": an order message, ticked, with a spark for the AI that reads it. Keep in sync with src/app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14775a" />
          <stop offset="1" stopColor="#0a4535" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <path
        d="M24 14h16c6.6 0 12 5.4 12 12v6c0 6.6-5.4 12-12 12H29l-9.5 7.5c-.7.5-1.6 0-1.5-.8l.8-7.6C14.6 41.6 12 37.4 12 32v-6c0-6.6 5.4-12 12-12Z"
        fill="#f6f4ee"
      />
      <path d="M23.5 29.5l6 6 12-12.5" fill="none" stroke="#0d5a45" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M51 6C52.26 11.74 52.26 11.74 58 13C52.26 14.26 52.26 14.26 51 20C49.74 14.26 49.74 14.26 44 13C49.74 11.74 49.74 11.74 51 6Z"
        fill="#e8a838"
      />
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
