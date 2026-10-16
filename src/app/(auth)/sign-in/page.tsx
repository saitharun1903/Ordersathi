import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  const showDemo = process.env.SHOW_DEMO_LOGIN !== "false";
  return <SignInForm showDemo={showDemo} />;
}
