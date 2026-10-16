"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-ink !text-white !border-0 !rounded-lg !shadow-[var(--shadow-pop)] !font-sans !text-[13px]",
          description: "!text-white/70",
          actionButton: "!bg-white/15 !text-white",
        },
      }}
    />
  );
}
