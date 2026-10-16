import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getContext, getSession } from "@/server/context";
import { Logo } from "@/components/app/logo";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { SignOutButton } from "@/components/onboarding/sign-out-button";

// Processing runs after the response (next/server `after`) and needs time on serverless hosts.
export const maxDuration = 300;

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const sp = await props.searchParams;
  const isNew = sp.new === "1";
  const ctx = await getContext();

  // UI steps: 0 = choose, 1 = business, 2 = catalogue, 3 = customer, 4 = first order. Stored 5 = complete.
  let initialStep = 0;
  if (ctx && !isNew) {
    const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { onboardingStep: true, isDemo: true } });
    if (!ws || ws.isDemo || ctx.role !== "OWNER" || ws.onboardingStep >= 5) redirect("/dashboard");
    // A workspace already exists, so business details are done — resume at catalogue or later.
    initialStep = Math.min(Math.max(ws.onboardingStep, 2), 4);
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={ctx ? "/dashboard" : "/onboarding"} aria-label="OrderSathi">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {ctx && isNew && (
              <Link href="/dashboard" className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-sunken hover:text-ink">
                Back to {ctx.workspaceName}
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <OnboardingFlow initialStep={initialStep} userName={session.user.name} workspaceName={ctx && !isNew ? ctx.workspaceName : null} />
      </main>
    </div>
  );
}
