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
    <div className="min-h-dvh lg:pl-[232px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-[#f1eee6] lg:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" aria-label="OrderSathi home">
            <Logo />
          </Link>
        </div>
        <div className="px-3">
          <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} />
        </div>
        <div className="px-3 pt-3">
          <Link
            href="/orders/new"
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded-lg bg-brand text-sm font-medium text-white shadow-[0_1px_0_rgb(0_0_0/0.08)] transition-colors hover:bg-brand-hover",
              newActive && "ring-2 ring-brand/25 ring-offset-2 ring-offset-[#f1eee6]",
            )}
          >
            <Plus className="size-4" /> New order
            <kbd className="ml-1 rounded border border-white/25 px-1 font-mono text-[10px] text-white/80">N</kbd>
          </Link>
        </div>
        <nav className="mt-4 flex flex-col gap-0.5 px-3" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(item.href) && !newActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
                  active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-[#e8e4da] hover:text-ink",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-brand" : "text-muted group-hover:text-ink-2")} />
                {item.label}
                {item.badge && openCount > 0 && (
                  <span className="ml-auto rounded-full bg-warn-soft px-1.5 text-[11px] font-semibold text-warn tnum">{openCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <UserMenu user={user} role={workspace.role} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-2 border-b border-line bg-canvas/95 px-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="OrderSathi home" className="flex min-w-0 items-center gap-2">
          <LogoMark className="size-7" />
          <span className="truncate text-sm font-semibold">{workspace.name}</span>
          {workspace.isDemo && <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warn">Demo</span>}
        </Link>
        <div className="flex items-center gap-1">
          <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} compact />
          <UserMenu user={user} role={workspace.role} compact />
        </div>
      </header>

      {workspace.isDemo && (
        <div className="border-b border-warn-line bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">
          <FlaskConical className="mr-1 inline size-3.5 align-[-2px]" />
          Sample workspace — the business, customers, products and prices are fictional demo data.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main"
      >
        {[NAV[0], NAV[1]].map((item) => (
          <MobileTab key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href) && !newActive} badge={item.badge ? openCount : 0} />
        ))}
        <Link href="/orders/new" className="flex flex-col items-center justify-center py-1.5" aria-label="New order">
          <span className={cn("flex size-11 items-center justify-center rounded-full bg-brand text-white shadow-[var(--shadow-pop)]", newActive && "ring-2 ring-brand/30 ring-offset-2")}>
            <Plus className="size-5" />
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
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand" : "text-muted")}>
      <Icon className="size-5" />
      {label}
      {badge > 0 && <span className="absolute right-[22%] top-1 rounded-full bg-warn-strong px-1 text-[10px] font-semibold leading-4 text-white tnum">{badge}</span>}
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
          <button className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-sunken" aria-label="Switch workspace">
            <Building2 className="size-4" />
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-left shadow-[var(--shadow-card)] hover:border-line-strong"
            aria-label="Switch workspace"
            disabled={pending}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-xs font-semibold text-brand-ink">
              {workspace.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight">{workspace.name}</span>
              <span className="block text-[11px] text-muted">
                {workspace.isDemo ? "Sample workspace" : "Live workspace"} · {workspace.role.toLowerCase()}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 text-faint" />
          </button>
        )}
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        <MenuLabel>Workspaces</MenuLabel>
        {workspaces.map((w) => (
          <MenuItem key={w.id} onSelect={() => w.id !== workspace.id && switchTo(w.id)}>
            <span className="min-w-0 flex-1 truncate">{w.name}</span>
            {w.isDemo && <span className="rounded bg-warn-soft px-1 text-[10px] font-semibold uppercase text-warn">Demo</span>}
            {w.id === workspace.id && <Check className="!text-brand" />}
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
        <button className={cn("flex items-center gap-2.5 rounded-lg text-left hover:bg-[#e8e4da]", compact ? "p-1" : "w-full p-1.5")} aria-label="Account menu">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{initials}</span>
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium leading-tight">{user.name}</span>
              <span className="block truncate text-[11px] text-muted">{user.email}</span>
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
