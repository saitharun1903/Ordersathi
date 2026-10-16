import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { listTeam } from "@/server/workspace/service";
import { providerStatus } from "@/server/ai";
import { can } from "@/server/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsView, type SettingsTab } from "@/components/settings/settings-view";
import pkg from "../../../../package.json";

export const metadata: Metadata = { title: "Settings" };

const TABS: SettingsTab[] = ["business", "team", "processing", "retention", "environment"];

export default async function SettingsPage(props: PageProps<"/settings">) {
  const ctx = await requirePageContext();
  const sp = await props.searchParams;
  const tabParam = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab = (TABS as string[]).includes(tabParam) ? (tabParam as SettingsTab) : "business";

  const [ws, team] = await Promise.all([prisma.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId } }), listTeam(ctx)]);
  const status = providerStatus();

  return (
    <>
      <PageHeader title="Settings" description={`${ws.name} · ${ws.isDemo ? "Sample workspace" : "Live workspace"}`} />
      <SettingsView
        initialTab={initialTab}
        // Sample workspaces are read-only here; the server enforces the same rule.
        canManageSettings={can(ctx.role, "settings.manage") && !ctx.isDemo}
        canManageTeam={can(ctx.role, "team.manage") && !ctx.isDemo}
        business={{
          name: ws.name,
          city: ws.city,
          state: ws.state,
          addressLine: ws.addressLine ?? "",
          phone: ws.phone ?? "",
          gstin: ws.gstin ?? "",
          preferredLanguage: ws.preferredLanguage,
          taxRatePercent: ws.taxRateBps === null ? "" : String(ws.taxRateBps / 100),
          taxLabel: ws.taxLabel ?? "",
        }}
        team={{
          currentUserId: ctx.userId,
          members: team.members.map((m) => ({ id: m.id, role: m.role, userId: m.user.id, name: m.user.name, email: m.user.email })),
          // Invite links are secrets: only people who can manage the team receive them.
          invites: team.invites.map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.createdAt.toISOString(), token: can(ctx.role, "team.manage") && !ctx.isDemo ? i.token : null })),
        }}
        providers={status}
        retentionDays={ws.sourceRetentionDays}
        environment={{ isDemo: ws.isDemo, version: pkg.version }}
      />
    </>
  );
}
