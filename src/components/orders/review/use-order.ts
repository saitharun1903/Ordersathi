"use client";
import * as React from "react";
import { toast } from "sonner";
import type { OrderView } from "@/server/orders/view-types";
import { loadOrderAction } from "@/server/actions/orders";
import type { ActionResult } from "@/server/errors";

/**
 * Holds the order view and runs mutations with optimistic-concurrency handling.
 * Every mutation sends the version it was based on; on conflict we reload and tell the user.
 */
export function useOrder(initial: OrderView) {
  const [view, setView] = React.useState(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const viewRef = React.useRef(view);
  React.useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);

  const reload = React.useCallback(async () => {
    const r = await loadOrderAction(viewRef.current.id);
    if (r.ok) setView(r.data);
    return r;
  }, []);

  const mutate = React.useCallback(
    async <T,>(key: string, fn: (v: OrderView) => Promise<ActionResult<T>>, pick: (data: T) => OrderView | null = (d) => d as unknown as OrderView) => {
      setPending(key);
      try {
        const r = await fn(viewRef.current);
        if (r.ok) {
          const next = pick(r.data);
          if (next) {
            viewRef.current = next;
            setView(next);
          }
          return r;
        }
        if (r.code === "CONFLICT") {
          await reload();
          toast.error("Someone else just changed this order", { description: "We loaded the latest version. Please check and try again." });
        } else if (r.code === "INVALID_STATE") {
          await reload();
          toast.error(r.message);
        } else {
          toast.error(r.message);
        }
        return r;
      } catch {
        toast.error("Network problem — your change was not saved. Please try again.");
        return { ok: false as const, code: "INTERNAL" as const, message: "Network error" };
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  // Poll while a processing job runs.
  const running = view.latestJob && (view.latestJob.status === "QUEUED" || view.latestJob.status === "RUNNING");
  React.useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await fetch(`/api/jobs/${viewRef.current.latestJob!.id}`, { cache: "no-store" }).catch(() => null);
      const r = await loadOrderAction(viewRef.current.id).catch(() => null);
      if (!cancelled && r?.ok) setView(r.data);
    };
    const t = setInterval(tick, 1200);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [running]);

  return { view, setView, pending, mutate, reload };
}
