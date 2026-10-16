"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function InboxFilters({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [pending, start] = React.useTransition();

  const set = React.useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(params.toString());
      if (value) p.set(key, value);
      else p.delete(key);
      start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => set("q", q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, params, set]);

  const any = ["q", "type", "customer", "range"].some((k) => params.get(k));
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center" aria-busy={pending}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <label htmlFor="inbox-q" className="sr-only">
          Search orders
        </label>
        <input
          id="inbox-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order #, customer, product or message text"
          className="h-9 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/12"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex">
        <Select aria-label="Input type" value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)} className="sm:w-36">
          <option value="">All inputs</option>
          <option value="TEXT">Messages</option>
          <option value="AUDIO">Voice notes</option>
          <option value="IMAGE">Photos</option>
        </Select>
        <Select aria-label="Customer" value={params.get("customer") ?? ""} onChange={(e) => set("customer", e.target.value)} className="sm:w-48">
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Received" value={params.get("range") ?? ""} onChange={(e) => set("range", e.target.value)} className="sm:w-36">
          <option value="">Any time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </Select>
      </div>
      {any && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            const p = new URLSearchParams();
            if (params.get("tab")) p.set("tab", params.get("tab")!);
            start(() => router.replace(`${pathname}?${p.toString()}`));
          }}
        >
          <X /> Clear
        </Button>
      )}
    </div>
  );
}
