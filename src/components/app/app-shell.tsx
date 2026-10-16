"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, FlaskConical, Inbox, LayoutDashboard, LogOut, Package, Plus, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { switchWorkspaceAction } from "@/server/actions/workspace";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Logo, LogoMark } from "./logo";

type Ws = { id: string; name: string; isDemo: boolean; role: string };

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Inbox, badge: true },
  { href: "/catalogue", label: "Catalogue", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  user,
  workspace,
  workspaces,
  openCount,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  workspace: Ws;
  workspaces: Ws[];
  openCount: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const newActive = pathname === "/orders/new";

  return (
    <div className="min-h-dvh lg:pl-[240px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col bg-night text-white lg:flex">
        <div className="flex h-16 items-center px-4">
          <Link href="/dashboard" aria-label="OrderSathi home" className="rounded-md">
            <Logo tone="dark" />
          </Link>
        </div>
        <div className="px-3">
          <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} />
        </div>
        <div className="px-3 pt-3">
          <Link
            href="/orders/new"
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-[10px] bg-volt text-sm font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] transition-colors hover:bg-volt-hover",
              newActive && "ring-2 ring-volt/40 ring-offset-2 ring-offset-night",
            )}
          >
            <Plus className="size-4" strokeWidth={2.5} /> New order
            <kbd className="ml-1 rounded border border-ink/20 px-1 font-mono text-[10px] text-ink/70">N</kbd>
          </Link>
        </div>
        <p className="mt-6 px-5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">Workspace</p>
        <nav className="mt-2 flex flex-col gap-0.5 px-3" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(item.href) && !newActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
                  active ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-volt" aria-hidden />}
                <item.icon className={cn("size-4", active ? "text-volt" : "text-white/45 group-hover:text-white/80")} />
                {item.label}
                {item.badge && openCount > 0 && (
                  <span className="ml-auto rounded-md bg-volt px-1.5 font-mono text-[11px] font-medium leading-5 text-ink tnum">{openCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-night-line p-3">
          <UserMenu user={user} role={workspace.role} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-night px-3 text-white lg:hidden">
        <Link href="/dashboard" aria-label="OrderSathi home" className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="size-8" />
          <span className="truncate font-display text-[15px] font-semibold tracking-[-0.015em]">{workspace.name}</span>
          {workspace.isDemo && <span className="rounded bg-volt px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-ink">Demo</span>}
        </Link>
        <div className="flex items-center gap-1">
          <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} compact />
          <UserMenu user={user} role={workspace.role} compact />
        </div>
      </header>

      {workspace.isDemo && (
        <div className="border-b border-brand-line bg-volt-soft px-4 py-1.5 text-center text-xs font-medium text-volt-ink">
          <FlaskConical className="mr-1 inline size-3.5 align-[-2px]" />
          Sample workspace — the business, customers, products and prices are fictional demo data.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Main"
      >
        {[NAV[0], NAV[1]].map((item) => (
          <MobileTab key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href) && !newActive} badge={item.badge ? openCount : 0} />
        ))}
        <Link href="/orders/new" className="flex flex-col items-center justify-center py-1.5" aria-label="New order">
          <span className={cn("flex size-11 items-center justify-center rounded-2xl bg-ink text-volt shadow-[var(--shadow-pop)]", newActive && "ring-2 ring-volt ring-offset-2")}>
            <Plus className="size-6" strokeWidth={2.5} />
          </span>
        </Link>
        {[NAV[2], NAV[3]].map((item) => (
          <MobileTab key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
        ))}
      </nav>
      <KeyboardShortcuts />
    </div>
  );
}

function MobileTab({ href, label, icon: Icon, active, badge = 0 }: { href: string; label: string; icon: React.ElementType; active: boolean; badge?: number }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-ink" : "text-muted")}>
      {active && <span className="absolute inset-x-[30%] top-0 h-[3px] rounded-b-full bg-volt" aria-hidden />}
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      {label}
      {badge > 0 && <span className="absolute right-[22%] top-1 rounded-md bg-volt px-1 font-mono text-[10px] font-medium leading-4 text-ink tnum">{badge}</span>}
    </Link>
  );
}

function WorkspaceSwitcher({ workspace, workspaces, compact }: { workspace: Ws; workspaces: Ws[]; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const switchTo = (id: string) =>
    start(async () => {
      const r = await switchWorkspaceAction(id);
      if (!r.ok) toast.error(r.message);
      else router.push("/dashboard");
    });
  return (
    <Menu>
      <MenuTrigger asChild>
        {compact ? (
          <button className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label="Switch workspace">
            <Building2 className="size-4" />
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-2.5 rounded-[10px] border border-night-line bg-night-2 px-2.5 py-2 text-left transition-colors hover:border-white/20"
            aria-label="Switch workspace"
            disabled={pending}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white font-display text-xs font-bold text-ink">
              {workspace.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight text-white">{workspace.name}</span>
              <span className="block text-[11px] text-white/45">
                {workspace.isDemo ? "Sample workspace" : "Live workspace"} · {workspace.role.toLowerCase()}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 text-white/40" />
          </button>
        )}
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        <MenuLabel>Workspaces</MenuLabel>
        {workspaces.map((w) => (
          <MenuItem key={w.id} onSelect={() => w.id !== workspace.id && switchTo(w.id)}>
            <span className="min-w-0 flex-1 truncate">{w.name}</span>
            {w.isDemo && <span className="rounded bg-volt px-1 font-mono text-[10px] font-medium uppercase text-ink">Demo</span>}
            {w.id === workspace.id && <Check className="!text-ink" />}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={() => router.push("/onboarding?new=1")}>
          <Plus /> Create a workspace
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function UserMenu({ user, role, compact }: { user: { name: string; email: string }; role: string; compact?: boolean }) {
  const router = useRouter();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button className={cn("flex items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.06]", compact ? "p-1" : "w-full p-1.5")} aria-label="Account menu">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-volt text-[11px] font-bold text-ink">{initials}</span>
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium leading-tight text-white">{user.name}</span>
              <span className="block truncate text-[11px] text-white/45">{user.email}</span>
            </span>
          )}
        </button>
      </MenuTrigger>
      <MenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-56">
        <MenuLabel>Signed in as {role.toLowerCase()}</MenuLabel>
        <MenuItem onSelect={() => router.push("/settings")}>
          <Settings /> Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.push("/sign-in");
            router.refresh();
          }}
        >
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** "N" opens a new order from anywhere (outside of text fields). */
function KeyboardShortcuts() {
  const router = useRouter();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/orders/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
