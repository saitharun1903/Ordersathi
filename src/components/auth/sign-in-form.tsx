"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FlaskConical } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert, PasswordInput } from "./password-input";

const DEMO_PASSWORD = "ordersathi-demo";
const DEMO_ACCOUNTS = [
  { key: "owner", label: "Owner", email: "owner@demo.ordersathi.in", description: "Everything, including business settings and team" },
  { key: "manager", label: "Manager", email: "manager@demo.ordersathi.in", description: "Approves orders, manages catalogue and customers" },
  { key: "operator", label: "Operator", email: "operator@demo.ordersathi.in", description: "Creates and edits draft orders for review" },
] as const;

type Errors = { email?: string; password?: string; form?: string };

export function validateCredentials(email: string, password: string): Errors {
  const e: Errors = {};
  if (!email.trim()) e.email = "Enter your email address";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address";
  if (!password) e.password = "Enter your password";
  else if (password.length < 8) e.password = "Passwords are at least 8 characters";
  return e;
}

/** Only same-site paths are allowed as a post-sign-in destination (no open redirects). */
export function safeNext(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return /^\/(?![/\\])[\w\-./?=&%]*$/.test(next) ? next : "/";
}

// A full navigation (not router.push + refresh) so the auth layout can't redirect to "/" mid-transition,
// and every server component renders with the new session.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility
export async function finishAuth(_router?: ReturnType<typeof useRouter>) {
  window.location.assign(safeNext());
}

export function SignInForm({ showDemo }: { showDemo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Errors>({});
  const [pending, setPending] = React.useState<null | "form" | (typeof DEMO_ACCOUNTS)[number]["key"]>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  async function signIn(emailValue: string, passwordValue: string, source: NonNullable<typeof pending>) {
    const v = validateCredentials(emailValue, passwordValue);
    setErrors(v);
    if (v.email) return emailRef.current?.focus();
    if (v.password) return passwordRef.current?.focus();
    setPending(source);
    try {
      const { error } = await authClient.signIn.email({ email: emailValue.trim(), password: passwordValue });
      if (error) {
        const msg =
          error.status === 401 || error.status === 400
            ? "That email and password don't match. Check them and try again."
            : error.status === 429
              ? "Too many attempts. Wait a minute and try again."
              : error.message || "Could not sign in. Please try again.";
        setErrors({ form: msg });
        setPending(null);
        return;
      }
      await finishAuth(router);
    } catch {
      setErrors({ form: "Could not reach OrderSathi. Check your connection and try again." });
      setPending(null);
    }
  }

  function signInAsDemo(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    void signIn(acc.email, DEMO_PASSWORD, acc.key);
  }

  const busy = pending !== null;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted">Welcome back. Pick up where your team left off.</p>

      <form
        className="mt-7 flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void signIn(email, password, "form");
        }}
      >
        <FormAlert>{errors.form}</FormAlert>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            ref={emailRef}
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput
            ref={passwordRef}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
            minLength={8}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" loading={pending === "form"} disabled={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        New to OrderSathi?{" "}
        <Link href="/sign-up" className="font-medium text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      {showDemo && (
        <section id="sample" aria-labelledby="demo-heading" className="mt-8 scroll-mt-6 rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] target:ring-2 target:ring-brand/40">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-warn-soft text-warn">
              <FlaskConical className="size-4" />
            </span>
            <div>
              <h2 id="demo-heading" className="text-sm font-semibold text-ink">
                Sample workspace
              </h2>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                Try OrderSathi with a fictional wholesaler. All customers, products and orders are demo data.
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.key}>
                <button
                  type="button"
                  onClick={() => signInAsDemo(acc)}
                  disabled={busy}
                  aria-busy={pending === acc.key || undefined}
                  className="group flex w-full items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-brand-line hover:bg-brand-soft/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">Sign in as {acc.label}</span>
                    <span className="block text-[12px] text-muted">{acc.description}</span>
                  </span>
                  {pending === acc.key ? (
                    <span className="text-[12px] text-muted">Signing in…</span>
                  ) : (
                    <ArrowRight className="size-4 shrink-0 text-faint transition-colors group-hover:text-brand" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
