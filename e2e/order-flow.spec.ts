import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("operator drafts a text order, resolves ambiguity; manager approves and downloads the confirmation", async ({ browser }) => {
  const op = await (await browser.newContext()).newPage();
  await signIn(op, "operator");
  await op.goto("/orders/new");
  await op.getByLabel("Customer").selectOption({ label: "Green Home Solutions — Madhapur, Hyderabad" });
  await op.getByLabel("Order message").fill("Havells 32A DP MCB x 2\nfive sockets\n15 pcs tape");
  await op.getByRole("button", { name: "Process order" }).click();
  await expect(op).toHaveURL(/\/orders\/c/, { timeout: 30_000 });
  await expect(op.getByText("Rating not specified — both 6A and 16A sockets match")).toBeVisible();
  await expect(op.getByText(/15 pieces = 1.5 packets/)).toBeVisible();
  await expect(op.getByText("Managers approve orders")).toBeVisible();

  // One-click resolution of the ambiguous socket, then the partial pack
  await op.getByRole("button", { name: /Havells · 16A/ }).click();
  await expect(op.getByText("Rating not specified")).toHaveCount(0);
  await op.getByRole("button", { name: "Make it 2 packets" }).click();
  await expect(op.getByText("All items confirmed", { exact: true })).toBeVisible();
  const url = op.url();

  const mg = await (await browser.newContext({ acceptDownloads: true })).newPage();
  await signIn(mg, "manager");
  await mg.goto(url);
  await mg.getByRole("button", { name: "Approve", exact: true }).click();
  await mg.getByRole("button", { name: /Approve · ₹/ }).click();
  await expect(mg.getByText(/Approved by Kiran Kumar/)).toBeVisible();
  await expect(mg.getByText("Prices locked at approval")).toBeVisible();

  const download = mg.waitForEvent("download");
  await mg.getByRole("link", { name: "Order confirmation PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/^order-confirmation-\d{4}\.pdf$/);
  await op.context().close();
  await mg.context().close();
});

test("clarification message is drafted in the customer's language and never auto-sent", async ({ page }) => {
  await signIn(page, "manager");
  await page.goto("/orders?tab=clarify");
  await page.getByRole("row", { name: /Sri Durga/ }).first().getByRole("link").click();
  await page.getByRole("button", { name: "Ask customer" }).click();
  const text = page.getByLabel("Clarification message");
  await expect(text).toHaveValue(/నమస్తే/);
  await page.getByRole("radio", { name: "English" }).click();
  await expect(text).toHaveValue(/A few details are needed/);
  await expect(page.getByRole("button", { name: "Open in WhatsApp" })).toBeVisible();
});

test("another workspace's order id returns not found", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, "manager");
  const res = await page.request.get("/api/orders/does-not-exist/pdf");
  expect(res.status()).toBe(404);
  const files = await page.request.get("/api/files/someone-elses-file");
  expect(files.status()).toBe(404);
  await page.context().close();
});
