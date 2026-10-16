import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { getSession } from "@/server/context";
import { getInvite } from "@/server/workspace/service";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/server/permissions";
import { Logo } from "@/components/app/logo";
import { AcceptInviteButton } from "@/components/auth/accept-invite-button";

export const metadata: Metadata = { title: "Join a workspace", robots: { index: false } };

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const [invite, session] = await Promise.all([getInvite(token), getSession()]);
  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <Link href="/" className="mb-8" aria-label="OrderSathi home">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        {!invite ? (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-sunken text-muted">
              <LinkIcon className="size-5" />
            </span>
            <h1 className="mt-4 text-lg font-semibold">This invitation link isn’t valid</h1>
            <p className="mt-1.5 text-sm text-muted">It may have expired, been used already, or been revoked. Ask the workspace owner to send you a new link.</p>
            <Link href="/" className="mt-6 inline-flex text-sm font-medium text-brand hover:underline">
              Go to OrderSathi
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Invitation</p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Join {invite.workspaceName}</h1>
            <p className="mt-2 text-sm text-ink-2">
              You’ve been invited as <span className="font-semibold">{ROLE_LABEL[invite.role]}</span> — {ROLE_DESCRIPTION[invite.role].toLowerCase()}.
            </p>
            <p className="mt-1 text-xs text-muted">Invitation sent to {invite.email}</p>
            <div className="mt-6">
              {session ? (
                <>
                  <AcceptInviteButton token={token} />
                  <p className="mt-3 text-xs text-muted">Signed in as {session.user.email}.</p>
                </>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href={`/sign-up?next=${next}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
                    Create an account
                  </Link>
                  <Link href={`/sign-in?next=${next}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-medium hover:bg-surface-2">
                    I have an account
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
