import { FlaskConical, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/status";

export function EnvironmentSection({ isDemo, version }: { isDemo: boolean; version: string }) {
  return (
    <Card>
      <CardHeader title="Environment" description="Which kind of workspace you're in and what version is running." />
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className={isDemo ? "flex gap-3 rounded-lg border border-warn-line bg-warn-soft p-4" : "flex gap-3 rounded-lg border border-brand-line bg-brand-soft/60 p-4"}>
          <span className={isDemo ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-warn" : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-brand"}>
            {isDemo ? <FlaskConical className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
          </span>
          <div>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              {isDemo ? "Sample workspace" : "Live workspace"}
              <Pill tone={isDemo ? "warn" : "ok"}>{isDemo ? "Demo" : "Live"}</Pill>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {isDemo
                ? "Everything here — customers, products, prices and orders — is fictional sample data for trying OrderSathi. It is kept completely separate from any live workspace."
                : "This workspace holds your real business data. Sample data is fictional and lives in separate sample workspaces — it never mixes with this one."}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[13px]">
          <dt className="text-muted">Workspace type</dt>
          <dd className="text-ink">{isDemo ? "Sample (demo data)" : "Live"}</dd>
          <dt className="text-muted">App version</dt>
          <dd className="font-mono text-[12.5px] text-ink">v{version}</dd>
        </dl>
      </div>
    </Card>
  );
}
