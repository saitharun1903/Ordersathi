"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, Minus, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/server/permissions";
import { changeRoleAction, inviteMemberAction, removeMemberAction, revokeInviteAction } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Pill } from "@/components/ui/status";
import { NETWORK_ERROR, ReadOnlyNote } from "./section-bits";

const ROLES: Role[] = ["OWNER", "MANAGER", "OPERATOR"];

export type TeamData = {
  currentUserId: string;
  members: { id: string; role: Role; userId: string; name: string; email: string }[];
  invites: { id: string; email: string; role: Role; createdAt: string }[];
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function TeamSection({ data, canManage }: { data: TeamData; canManage: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <MembersCard data={data} canManage={canManage} />
      {canManage ? <InviteCard /> : <ReadOnlyNote>Only owners can invite people or change roles.</ReadOnlyNote>}
      {data.invites.length > 0 && <InvitesCard invites={data.invites} canManage={canManage} />}
      <PermissionsMatrix />
    </div>
  );
}

function MembersCard({ data, canManage }: { data: TeamData; canManage: boolean }) {
  const router = useRouter();
  const [rolePending, setRolePending] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<TeamData["members"][number] | null>(null);
  const [removePending, setRemovePending] = React.useState(false);

  async function changeRole(id: string, role: Role, name: string) {
    setRolePending(id);
    try {
      const r = await changeRoleAction(id, role);
      if (!r.ok) toast.error("Role not changed", { description: r.message });
      else {
        toast.success(`${name} is now ${/^[AEIOU]/.test(ROLE_LABEL[role]) ? "an" : "a"} ${ROLE_LABEL[role]}`);
        router.refresh();
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setRolePending(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemovePending(true);
    try {
      const r = await removeMemberAction(removing.id);
      if (!r.ok) {
        toast.error("Member not removed", { description: r.message });
      } else {
        toast.success(`${removing.name} was removed from the workspace`);
        setRemoving(null);
        router.refresh();
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setRemovePending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Members" description={`${data.members.length} ${data.members.length === 1 ? "person has" : "people have"} access to this workspace.`} />
      <ul className="divide-y divide-line">
        {data.members.map((m) => {
          const isYou = m.userId === data.currentUserId;
          return (
            <li key={m.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-[12px] font-semibold text-ink-2" aria-hidden>
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-ink">
                    {m.name}
                    {isYou && <Pill tone="brand">You</Pill>}
                  </p>
                  <p className="truncate text-[12.5px] text-muted">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-11 sm:pl-0">
                {canManage ? (
                  <>
                    <label htmlFor={`role-${m.id}`} className="sr-only">
                      Role for {m.name}
                    </label>
                    <Select
                      id={`role-${m.id}`}
                      className="w-36"
                      value={m.role}
                      disabled={rolePending === m.id}
                      aria-busy={rolePending === m.id || undefined}
                      onChange={(e) => changeRole(m.id, e.target.value as Role, m.name)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    {!isYou && (
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)}>
                        <UserMinus aria-hidden />
                      </Button>
                    )}
                    {isYou && <span className="size-8" aria-hidden />}
                  </>
                ) : (
                  <Pill tone={m.role === "OWNER" ? "brand" : "neutral"}>{ROLE_LABEL[m.role]}</Pill>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!removing} onOpenChange={(o) => !o && !removePending && setRemoving(null)}>
        {removing && (
          <DialogContent
            title={`Remove ${removing.name}?`}
            description="They will lose access to this workspace immediately. Orders and approvals they made stay in the history."
            footer={
              <>
                <DialogClose asChild>
                  <Button variant="ghost" disabled={removePending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button variant="danger" loading={removePending} onClick={confirmRemove}>
                  Remove member
                </Button>
              </>
            }
          >
            <p className="text-[13px] text-ink-2">
              {removing.email} · {ROLE_LABEL[removing.role]}
            </p>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}

function InviteCard() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("OPERATOR");
  const [error, setError] = React.useState<string | undefined>();
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      document.getElementById("invite-email")?.focus();
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      const r = await inviteMemberAction({ email: email.trim(), role });
      if (!r.ok) {
        setError(r.fieldErrors?.email ?? r.message);
        toast.error("Invitation not sent", { description: r.message });
        return;
      }
      toast.success(
        r.data.added ? `${email.trim()} already had an account and was added as ${ROLE_LABEL[role]}.` : `Invitation saved for ${email.trim()}.`,
        r.data.added ? undefined : { description: "They join automatically when they sign up with this email." },
      );
      setEmail("");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      toast.error(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Invite someone"
        description="Invited people join automatically when they sign up (or sign in) with that email. OrderSathi doesn't send the email — share the sign-up link with them yourself."
      />
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field label="Email" htmlFor="invite-email" error={error}>
            <Input id="invite-email" type="email" inputMode="email" autoComplete="off" placeholder="name@business.in" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={pending}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-muted" aria-live="polite">
            <span className="font-medium text-ink-2">{ROLE_LABEL[role]}:</span> {ROLE_DESCRIPTION[role]}
          </p>
          <Button type="submit" variant="primary" loading={pending}>
            {!pending && <Mail aria-hidden />} Invite
          </Button>
        </div>
      </form>
    </Card>
  );
}

function InvitesCard({ invites, canManage }: { invites: TeamData["invites"]; canManage: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  async function revoke(id: string, email: string) {
    setPending(id);
    try {
      const r = await revokeInviteAction(id);
      if (!r.ok) toast.error("Invitation not revoked", { description: r.message });
      else {
        toast.success(`Invitation for ${email} revoked`);
        router.refresh();
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader title="Pending invitations" description="These people haven't signed up yet." />
      <ul className="divide-y divide-line">
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-ink">{i.email}</p>
              <p className="text-[12px] text-muted">Invited {dateFmt.format(new Date(i.createdAt))}</p>
            </div>
            <Pill>{ROLE_LABEL[i.role]}</Pill>
            {canManage && (
              <Button variant="ghost" size="sm" loading={pending === i.id} onClick={() => revoke(i.id, i.email)} aria-label={`Revoke invitation for ${i.email}`}>
                {pending !== i.id && <X aria-hidden />} Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

const CAPABILITIES: { label: string; roles: Role[] }[] = [
  { label: "Create & edit draft orders", roles: ["OWNER", "MANAGER", "OPERATOR"] },
  { label: "Approve or reject orders", roles: ["OWNER", "MANAGER"] },
  { label: "Manage catalogue & customers", roles: ["OWNER", "MANAGER"] },
  { label: "Manage settings & team", roles: ["OWNER"] },
];

function PermissionsMatrix() {
  return (
    <Card>
      <CardHeader title="What each role can do" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-[13px]">
          <caption className="sr-only">Permissions by role</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="px-4 py-2.5 font-medium text-muted sm:px-5">
                Capability
              </th>
              {ROLES.map((r) => (
                <th key={r} scope="col" className="w-24 px-2 py-2.5 text-center font-semibold text-ink">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {CAPABILITIES.map((c) => (
              <tr key={c.label}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink-2 sm:px-5">
                  {c.label}
                </th>
                {ROLES.map((r) => {
                  const ok = c.roles.includes(r);
                  return (
                    <td key={r} className="px-2 py-2.5 text-center">
                      <span className={cn("inline-flex size-6 items-center justify-center rounded-full", ok ? "bg-ok-soft text-ok" : "text-faint")}>
                        {ok ? <Check className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
                        <span className="sr-only">{ok ? "Allowed" : "Not allowed"}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}
