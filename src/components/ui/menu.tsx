"use client";
import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ className, align = "end", ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-[var(--shadow-pop)] data-[state=open]:animate-fade-in", className)}
        {...props}
      />
    </M.Portal>
  );
}

export function MenuItem({ className, danger, ...props }: React.ComponentProps<typeof M.Item> & { danger?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken [&_svg]:size-4 [&_svg]:text-muted",
        danger ? "text-bad" : "text-ink",
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-line" />;
export function MenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-faint", className)} {...props} />;
}
