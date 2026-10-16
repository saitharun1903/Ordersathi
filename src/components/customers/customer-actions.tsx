"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveCustomerAction } from "@/server/actions/catalogue";
import { ConfirmAction } from "@/components/catalogue/confirm-action";
import { CustomerDialog, type CustomerFormValues } from "./customer-dialog";

export function AddCustomerButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  return (
    <CustomerDialog
      trigger={
        <Button variant={variant} size="sm">
          <Plus /> Add customer
        </Button>
      }
    />
  );
}

export function CustomerActions({ customer, archived }: { customer: CustomerFormValues; archived: boolean }) {
  const router = useRouter();
  async function archive() {
    const r = await archiveCustomerAction(customer.id);
    if (!r.ok) {
      toast.error(r.message);
      return false;
    }
    toast.success(`${customer.name} archived`);
    router.push("/customers");
    return true;
  }
  return (
    <>
      <CustomerDialog
        customer={customer}
        trigger={
          <Button size="sm">
            <Pencil /> Edit
          </Button>
        }
      />
      {!archived && (
        <ConfirmAction
          title={`Archive ${customer.name}?`}
          description="They'll be hidden from the customer list and can't be picked for new orders. Their order history, prices and wording are kept."
          confirmLabel="Archive customer"
          onConfirm={archive}
          trigger={
            <Button variant="ghost" size="sm" className="hover:text-bad">
              <Archive /> Archive
            </Button>
          }
        />
      )}
    </>
  );
}
