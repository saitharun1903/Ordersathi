import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requirePageContext();
  const [memberships, openCount] = await Promise.all([
    prisma.membership.findMany({ where: { userId: ctx.userId }, include: { workspace: true }, orderBy: { createdAt: "asc" } }),
    prisma.order.count({ where: { workspaceId: ctx.workspaceId, status: { in: ["NEEDS_CLARIFICATION", "READY_FOR_REVIEW", "DRAFT"] } } }),
  ]);
  return (
    <AppShell
      user={{ name: ctx.userName, email: ctx.userEmail }}
      workspace={{ id: ctx.workspaceId, name: ctx.workspaceName, isDemo: ctx.isDemo, role: ctx.role }}
      workspaces={memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name, isDemo: m.workspace.isDemo, role: m.role }))}
      openCount={openCount}
    >
      {children}
    </AppShell>
  );
}
