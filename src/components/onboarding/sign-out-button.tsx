"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.signOut();
        if (error) {
          toast.error("Could not sign out. Please try again.");
          setPending(false);
          return;
        }
        router.push("/sign-in");
        router.refresh();
      }}
    >
      {!pending && <LogOut aria-hidden />}
      Sign out
    </Button>
  );
}
