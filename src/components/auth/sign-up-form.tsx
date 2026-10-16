"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert, PasswordInput } from "./password-input";
import { finishAuth, validateCredentials } from "./sign-in-form";

type Errors = { name?: string; email?: string; password?: string; form?: React.ReactNode };

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Errors>({});
  const [pending, setPending] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v: Errors = validateCredentials(email, password);
    if (password && password.length < 8) v.password = "Use at least 8 characters";
    if (name.trim().length < 2) v.name = "Enter your name";
    setErrors(v);
    if (v.name) return nameRef.current?.focus();
    if (v.email) return emailRef.current?.focus();
    if (v.password) return passwordRef.current?.focus();

    setPending(true);
    try {
      const { error } = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() });
      if (error) {
        const exists = error.status === 422 || /exist/i.test(error.message ?? "");
        setErrors(
          exists
            ? {
                email: "An account with this email already exists",
                form: (
                  <>
                    You already have an account.{" "}
                    <Link href="/sign-in" className="font-medium underline underline-offset-2">
                      Sign in instead
                    </Link>
                  </>
                ),
              }
            : /password/i.test(error.message ?? "")
              ? { password: error.message }
              : { form: error.message || "Could not create your account. Please try again." },
        );
        setPending(false);
        return;
      }
      await finishAuth(router);
    } catch {
      setErrors({ form: "Could not reach OrderSathi. Check your connection and try again." });
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">Set up your order desk in a few minutes. No card required.</p>

      <form className="mt-7 flex flex-col gap-4" noValidate onSubmit={onSubmit}>
        <FormAlert>{errors.form}</FormAlert>
        <Field label="Your name" htmlFor="name" error={errors.name}>
          <Input ref={nameRef} id="name" autoComplete="name" className="h-10" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} required />
        </Field>
        <Field label="Work email" htmlFor="email" error={errors.email} hint="Invited by a teammate? Open their invite link after you sign up.">
          <Input
            ref={emailRef}
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters.">
          <PasswordInput
            ref={passwordRef}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            required
            minLength={8}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" loading={pending}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-ink underline decoration-volt decoration-2 underline-offset-4 hover:decoration-ink">
          Sign in
        </Link>
      </p>
    </div>
  );
}
