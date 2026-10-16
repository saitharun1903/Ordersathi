"use client";
import * as React from "react";
import { Tooltip as T } from "radix-ui";

export function Tip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  if (!content) return <>{children}</>;
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-xs text-white shadow-[var(--shadow-pop)] data-[state=delayed-open]:animate-fade-in">
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
