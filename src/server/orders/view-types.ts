// Serializable view model shared between server loaders and client components.
import type { LineIssue } from "./evaluate";

export type ProductBrief = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  specs: Record<string, string>;
  sellingUnit: string;
  conversions: { unit: string; factor: string }[];
  pricePaise: number; // effective for this order's customer
  standardPricePaise: number;
  priceSource: "CUSTOMER" | "STANDARD";
  archived: boolean;
};

export type LineView = {
  id: string;
  position: number;
  originalText: string;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  rawUnit: string | null;
  sellQuantity: string | null;
  unitPricePaise: number | null;
  priceSource: string | null;
  lineTotalPaise: number | null;
  status: "CONFIRMED" | "NEEDS_REVIEW" | "MISSING_INFO" | "UNMATCHED";
  issues: LineIssue[];
  product: ProductBrief | null;
  candidates: (ProductBrief & { reason: string })[];
  method: string | null;
  source: string | null;
  manuallyEdited: boolean;
};

export type JobView = {
  id: string;
  kind: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  stage: string;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  provider: string | null;
  attempts: number;
  createdAt: string;
};

export type OrderView = {
  id: string;
  number: number;
  status: "DRAFT" | "NEEDS_CLARIFICATION" | "READY_FOR_REVIEW" | "APPROVED" | "REJECTED";
  version: number;
  inputType: "TEXT" | "AUDIO" | "IMAGE";
  inputLanguage: "AUTO" | "EN" | "TE";
  detectedLanguage: string | null;
  sourceText: string | null;
  transcript: string | null;
  transcriptDirty: boolean;
  source: { id: string; kind: string; mimeType: string | null; originalName: string | null; url: string | null; purged: boolean } | null;
  customer: { id: string; name: string; contactName: string | null; phone: string | null; city: string | null; preferredLanguage: string } | null;
  createdAt: string;
  createdByName: string | null;
  lines: LineView[];
  subtotalPaise: number;
  taxPaise: number;
  taxRateBps: number | null;
  taxLabel: string | null;
  totalPaise: number;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  snapshot: import("./service").ApprovedSnapshot | null;
  latestJob: JobView | null;
  clarifications: { id: string; message: string; status: string; createdAt: string; createdByName: string | null }[];
  timeline: { id: string; type: string; actorName: string | null; createdAt: string; data: Record<string, unknown> }[];
  blockers: string[];
  counts: { confirmed: number; review: number; missing: number; unmatched: number };
  permissions: { canEdit: boolean; canApprove: boolean };
  isDemo: boolean;
};
