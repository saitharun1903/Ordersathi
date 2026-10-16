"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { run } from "./run";
import * as svc from "../orders/service";
import { getOrderView } from "../orders/view";
import { runJob } from "../orders/pipeline";
import { searchCatalogue } from "../catalogue/service";

// Every mutation returns the fresh order view so the review screen updates in place.

export async function loadOrderAction(orderId: string) {
  return run("order.load", (ctx) => getOrderView(ctx, orderId));
}

export async function updateLineAction(orderId: string, version: number, lineId: string, patch: Parameters<typeof svc.updateLine>[4]) {
  return run("line.update", async (ctx) => {
    await svc.updateLine(ctx, orderId, version, lineId, patch);
    return getOrderView(ctx, orderId);
  });
}

export async function addLineAction(orderId: string, version: number, input: Parameters<typeof svc.addLine>[3]) {
  return run("line.add", async (ctx) => {
    await svc.addLine(ctx, orderId, version, input);
    return getOrderView(ctx, orderId);
  });
}

export async function removeLineAction(orderId: string, version: number, lineId: string) {
  return run("line.remove", async (ctx) => {
    await svc.removeLine(ctx, orderId, version, lineId);
    return getOrderView(ctx, orderId);
  });
}

export async function setCustomerAction(orderId: string, version: number, customerId: string | null) {
  return run("order.customer", async (ctx) => {
    await svc.setCustomer(ctx, orderId, version, customerId);
    return getOrderView(ctx, orderId);
  });
}

export async function saveTranscriptAction(orderId: string, version: number, transcript: string) {
  return run("order.transcript", async (ctx) => {
    await svc.updateTranscript(ctx, orderId, version, transcript);
    return getOrderView(ctx, orderId);
  });
}

export async function reprocessAction(orderId: string, version: number, transcript?: string) {
  return run("order.reprocess", async (ctx) => {
    const { jobId } = await svc.reprocessOrder(ctx, orderId, version, transcript);
    after(() => runJob(jobId));
    return getOrderView(ctx, orderId);
  });
}

export async function retryJobAction(orderId: string, jobId: string, useRules = false) {
  return run("job.retry", async (ctx) => {
    await svc.retryJob(ctx, jobId, { useRules });
    after(() => runJob(jobId));
    return getOrderView(ctx, orderId);
  });
}

export async function approveAction(orderId: string, version: number) {
  return run("order.approve", async (ctx) => {
    const r = await svc.approveOrder(ctx, orderId, version);
    revalidatePath("/dashboard");
    return { view: await getOrderView(ctx, orderId), alreadyApproved: r.alreadyApproved };
  });
}

export async function rejectAction(orderId: string, version: number, reason: string) {
  return run("order.reject", async (ctx) => {
    await svc.rejectOrder(ctx, orderId, version, reason);
    return getOrderView(ctx, orderId);
  });
}

export async function reopenAction(orderId: string, version: number) {
  return run("order.reopen", async (ctx) => {
    await svc.reopenOrder(ctx, orderId, version);
    return getOrderView(ctx, orderId);
  });
}

export async function recordClarificationAction(orderId: string, message: string, status: "DRAFT" | "COPIED" | "SHARED") {
  return run("clarification.record", async (ctx) => {
    await svc.recordClarification(ctx, orderId, message, status);
    return getOrderView(ctx, orderId);
  });
}

export async function recordShareAction(orderId: string, channel: "COPY" | "WHATSAPP" | "PDF") {
  return run("confirmation.share", (ctx) => svc.recordShare(ctx, orderId, channel));
}

export async function searchCatalogueAction(q: string, customerId: string | null) {
  return run("catalogue.search", (ctx) => searchCatalogue(ctx, q, customerId));
}
