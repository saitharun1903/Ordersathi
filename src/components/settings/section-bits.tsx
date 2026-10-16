import * as React from "react";
import { Lock } from "lucide-react";

/** Notice shown to members who can view but not change a section. */
export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-line bg-sunken/60 px-3 py-2 text-[13px] text-ink-2">
      <Lock className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export const NETWORK_ERROR = "Could not reach OrderSathi. Check your connection and try again.";
