"use client";
import * as React from "react";
import { Tabs as T } from "radix-ui";
import { Archive, Building2, Cpu, Server, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessSection, type BusinessData } from "./business-section";
import { TeamSection, type TeamData } from "./team-section";
import { ProcessingSection, type ProviderStatusData } from "./processing-section";
import { RetentionSection } from "./retention-section";
import { EnvironmentSection } from "./environment-section";

export type SettingsTab = "business" | "team" | "processing" | "retention" | "environment";

const NAV: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "business", label: "Business", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "processing", label: "Processing", icon: Cpu },
  { id: "retention", label: "Data retention", icon: Archive },
  { id: "environment", label: "Environment", icon: Server },
];

export function SettingsView({
  initialTab,
  canManageSettings,
  canManageTeam,
  business,
  team,
  providers,
  retentionDays,
  environment,
}: {
  initialTab: SettingsTab;
  canManageSettings: boolean;
  canManageTeam: boolean;
  business: BusinessData;
  team: TeamData;
  providers: ProviderStatusData;
  retentionDays: number;
  environment: { isDemo: boolean; version: string };
}) {
  const [tab, setTab] = React.useState<SettingsTab>(initialTab);

  function onChange(v: string) {
    setTab(v as SettingsTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", v);
      window.history.replaceState(null, "", url);
    } catch {
      // URL sync is a convenience only.
    }
  }

  return (
    <T.Root value={tab} onValueChange={onChange} className="flex flex-col gap-5 lg:flex-row lg:gap-8">
      <T.List
        aria-label="Settings sections"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-px [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:sticky lg:top-7 lg:mx-0 lg:w-52 lg:shrink-0 lg:flex-col lg:self-start lg:border-b-0 lg:px-0 lg:pb-0"
      >
        {NAV.map(({ id, label, icon: Icon }) => (
          <T.Trigger
            key={id}
            value={id}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-2.5 text-[13.5px] font-medium text-muted transition-colors hover:text-ink",
              "data-[state=active]:text-ink",
              // mobile: underline tabs; desktop: sub-nav pills
              "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full data-[state=active]:after:bg-brand lg:after:hidden",
              "lg:h-9 lg:rounded-lg lg:hover:bg-sunken lg:data-[state=active]:bg-surface lg:data-[state=active]:shadow-[var(--shadow-card)] lg:data-[state=active]:ring-1 lg:data-[state=active]:ring-line",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </T.Trigger>
        ))}
      </T.List>

      <div className="min-w-0 flex-1 lg:max-w-3xl">
        <T.Content value="business" className="outline-none">
          <BusinessSection data={business} canEdit={canManageSettings} />
        </T.Content>
        <T.Content value="team" className="outline-none">
          <TeamSection data={team} canManage={canManageTeam} />
        </T.Content>
        <T.Content value="processing" className="outline-none">
          <ProcessingSection status={providers} />
        </T.Content>
        <T.Content value="retention" className="outline-none">
          <RetentionSection days={retentionDays} canEdit={canManageSettings} />
        </T.Content>
        <T.Content value="environment" className="outline-none">
          <EnvironmentSection {...environment} />
        </T.Content>
      </div>
    </T.Root>
  );
}

