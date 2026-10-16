import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function OrderNotFound() {
  return (
    <EmptyState
      icon={<SearchX />}
      title="Order not found"
      description="It may belong to a different workspace, or the link is wrong."
      action={
        <Button asChild variant="secondary">
          <Link href="/orders">Back to orders</Link>
        </Button>
      }
    />
  );
}
