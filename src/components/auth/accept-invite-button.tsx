"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/server/actions/workspace";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const r = await acceptInviteAction(token).catch(() => null);
        if (r?.ok) {
          toast.success("You’ve joined the workspace");
          router.push("/dashboard");
          router.refresh();
        } else {
          toast.error(r?.message ?? "Couldn’t accept the invitation. Please try again.");
          setPending(false);
        }
      }}
    >
      Join workspace
    </Button>
  );
}
