import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { requirePageContext } from "@/server/context";
import { can } from "@/server/permissions";
import { IMPORT_FIELDS } from "@/server/catalogue/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ImportWizard } from "@/components/catalogue/import-wizard";

export const metadata: Metadata = { title: "Import catalogue" };

export default async function CatalogueImportPage() {
  const ctx = await requirePageContext();
  const canManage = can(ctx.role, "catalogue.manage");

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/catalogue" className="mb-3 inline-flex items-center gap-1 rounded text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Catalogue
      </Link>
      <PageHeader title="Import catalogue from CSV" description="Add new products and update existing ones by SKU. Nothing changes until you confirm the import." />
      {canManage ? (
        <ImportWizard fields={IMPORT_FIELDS.map((f) => ({ key: f.key, label: f.label, required: f.required }))} />
      ) : (
        <Card>
          <EmptyState
            icon={<Lock />}
            title="Managers can import the catalogue"
            description="You can view products and use them in orders. Ask an owner or manager to import or change catalogue data."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/catalogue">Back to catalogue</Link>
              </Button>
            }
          />
        </Card>
      )}
    </div>
  );
}
