import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("visitors see the landing page and can reach the sample workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Voice notes in.");
  await page.getByRole("link", { name: "Explore the sample workspace" }).click();
  await expect(page).toHaveURL(/sign-in#sample/);
  await expect(page.getByRole("heading", { name: "Sample workspace" })).toBeVisible();
});

test("a new teammate joins only through the invite link", async ({ browser }) => {
  // Owner of a fresh live workspace creates an invite
  const owner = await (await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  const stamp = Date.now();
  await owner.goto("/sign-up");
  await signUp(owner, "Invite Owner", `inv.owner.${stamp}@example.in`);
  await expect(owner).toHaveURL(/onboarding/, { timeout: 30_000 });
  await owner.getByText("Set up my business").click();
  await owner.getByLabel("Business name").fill("Invite Test Electricals");
  await owner.getByLabel("City").fill("Hyderabad");
  await owner.getByRole("button", { name: /Create workspace/ }).click();
  await expect(owner.getByRole("button", { name: /Add products/ })).toBeVisible();
  await owner.goto("/settings?tab=team");
  await owner.getByLabel("Email").fill(`teammate.${stamp}@example.in`);
  await owner.getByRole("button", { name: "Invite" }).click();
  await expect(owner.getByText(`teammate.${stamp}@example.in`).first()).toBeVisible();
  await owner.getByRole("button", { name: "Copy link" }).click();
  const copied = await owner.evaluate(() => navigator.clipboard.readText());
  const link = new URL(copied).pathname;
  expect(link).toBeTruthy();
  await owner.context().close();

  // Teammate opens the link, signs up, and joins
  const mate = await (await browser.newContext()).newPage();
  await mate.goto(link!);
  await expect(mate.getByRole("heading", { name: "Join Invite Test Electricals" })).toBeVisible();
  await mate.getByRole("link", { name: "Create an account" }).click();
  await expect(mate).toHaveURL(/sign-up\?next=/);
  await signUp(mate, "New Teammate", `teammate.${stamp}@example.in`);
  await expect(mate).toHaveURL(/\/invite\//, { timeout: 30_000 });
  await mate.getByRole("button", { name: "Join workspace" }).click();
  await expect(mate).toHaveURL(/dashboard/, { timeout: 30_000 });
  await expect(mate.getByText("Invite Test Electricals").first()).toBeVisible();
  await mate.context().close();
});
