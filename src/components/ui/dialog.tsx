"use client";
import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  footer,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-line bg-surface shadow-[var(--shadow-pop)] focus:outline-none data-[state=open]:animate-slide-up sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <D.Title className="text-base font-semibold text-ink">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-[13px] text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
            )}
          </div>
          <D.Close className="-mr-1 rounded-md p-1 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3 sm:rounded-b-2xl">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}

/** Right-hand drawer on desktop, bottom sheet on mobile. */
export function SheetContent({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/25 data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-2xl border border-line bg-surface shadow-[var(--shadow-pop)] focus:outline-none data-[state=open]:animate-slide-up sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(560px,100vw)] sm:rounded-none sm:rounded-l-2xl sm:data-[state=open]:animate-slide-in-right",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <D.Title className="text-base font-semibold text-ink">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-[13px] text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Panel"}</D.Description>
            )}
          </div>
          <D.Close className="-mr-1 rounded-md p-1 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}
