import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePageContext } from "@/server/context";
import { providerStatus } from "@/server/ai";
import { FIXTURES } from "@/server/ai/fixtures";
import { PageHeader } from "@/components/ui/page-header";
import { NewOrderForm } from "@/components/orders/new-order-form";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage(props: PageProps<"/orders/new">) {
  const ctx = await requirePageContext();
  const sp = await props.searchParams;
  const customers = await prisma.customer.findMany({
    where: { workspaceId: ctx.workspaceId, archivedAt: null },
    select: { id: true, name: true, city: true, preferredLanguage: true },
    orderBy: { name: "asc" },
  });
  const status = providerStatus();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New order"
        description="Paste a message, upload a voice note or photo. OrderSathi drafts the order — you review it before anything is approved."
      />
      <NewOrderForm
        customers={customers}
        initialCustomerId={typeof sp.customer === "string" ? sp.customer : null}
        audioLive={status.audio.state === "live"}
        imageLive={status.image.state === "live"}
        extractionLabel={status.extraction.label}
        samples={FIXTURES.map((f) => ({ id: f.id, kind: f.kind, file: f.file, title: f.title, description: f.description }))}
      />
    </div>
  );
}
