"use server";
import { revalidatePath } from "next/cache";
import { run } from "./run";
import * as cat from "../catalogue/service";
import * as cust from "../customers/service";

export async function createProductAction(input: unknown) {
  return run("product.create", async (ctx) => {
    const id = await cat.createProduct(ctx, input);
    revalidatePath("/catalogue");
    return { id };
  });
}
export async function updateProductAction(id: string, input: unknown) {
  return run("product.update", async (ctx) => {
    const r = await cat.updateProduct(ctx, id, input);
    revalidatePath("/catalogue");
    return r;
  });
}
export async function archiveProductAction(id: string, archived: boolean) {
  return run("product.archive", async (ctx) => {
    await cat.setProductArchived(ctx, id, archived);
    revalidatePath("/catalogue");
  });
}
export async function validateImportAction(rows: cat.ImportRow[]) {
  return run("catalogue.validate_import", (ctx) => cat.validateImport(ctx, rows));
}
export async function commitImportAction(rows: cat.ImportRow[]) {
  return run("catalogue.import", async (ctx) => {
    const r = await cat.commitImport(ctx, rows);
    revalidatePath("/catalogue");
    return r;
  });
}

export async function createCustomerAction(input: unknown) {
  return run("customer.create", async (ctx) => {
    const id = await cust.createCustomer(ctx, input);
    revalidatePath("/customers");
    return { id };
  });
}
export async function updateCustomerAction(id: string, input: unknown) {
  return run("customer.update", async (ctx) => {
    await cust.updateCustomer(ctx, id, input);
    revalidatePath(`/customers/${id}`);
    revalidatePath("/customers");
  });
}
export async function archiveCustomerAction(id: string) {
  return run("customer.archive", async (ctx) => {
    await cust.archiveCustomer(ctx, id);
    revalidatePath("/customers");
  });
}
export async function setCustomerPriceAction(customerId: string, input: unknown) {
  return run("customer.price", async (ctx) => {
    await cust.setCustomerPrice(ctx, customerId, input);
    revalidatePath(`/customers/${customerId}`);
  });
}
export async function removeCustomerPriceAction(customerId: string, productId: string) {
  return run("customer.price_remove", async (ctx) => {
    await cust.removeCustomerPrice(ctx, customerId, productId);
    revalidatePath(`/customers/${customerId}`);
  });
}
export async function addCustomerAliasAction(customerId: string, input: unknown) {
  return run("customer.alias", async (ctx) => {
    await cust.addCustomerAlias(ctx, customerId, input);
    revalidatePath(`/customers/${customerId}`);
  });
}
export async function removeCustomerAliasAction(customerId: string, aliasId: string) {
  return run("customer.alias_remove", async (ctx) => {
    await cust.removeCustomerAlias(ctx, aliasId);
    revalidatePath(`/customers/${customerId}`);
  });
}
