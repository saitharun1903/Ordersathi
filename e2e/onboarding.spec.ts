import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("a new wholesaler sets up a live workspace and processes a first order", async ({ page }) => {
  const email = `owner.${Date.now()}@example.in`;
  await page.goto("/sign-up");
  await signUp(page, "Test Owner", email);
  await expect(page).toHaveURL(/onboarding/, { timeout: 30_000 });

  await page.getByText("Set up my business").click();
  await page.getByLabel("Business name").fill("Ganesh Electricals");
  await page.getByLabel("City").fill("Guntur");
  await page.getByRole("button", { name: /Create workspace/ }).click();

  await page.getByRole("button", { name: /Add products/ }).click();
  await page.getByLabel("SKU").fill("GE-SW-6A");
  await page.getByLabel("Product name").fill("Generic 6A switch");
  await page.getByLabel("Category").fill("Switch");
  await page.getByLabel("Selling price (₹)").fill("35");
  await page.getByRole("button", { name: /Add product/ }).click();
  await expect(page.getByText("Generic 6A switch").first()).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByLabel("Shop or business name").fill("Ravi Traders");
  await page.getByRole("button", { name: /Add customer/ }).click();
  await expect(page.getByText("Ravi Traders").first()).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Process your first order/ }).click();

  await expect(page).toHaveURL(/orders\/new/);
  await page.getByLabel("Customer").selectOption({ label: "Ravi Traders" });
  await page.getByLabel("Order message").fill("6A switch 25");
  await page.getByRole("button", { name: "Process order" }).click();
  await expect(page).toHaveURL(/\/orders\/c/, { timeout: 30_000 });
  await expect(page.getByText("Generic 6A switch").first()).toBeVisible();
  await expect(page.getByText("All items confirmed", { exact: true })).toBeVisible();
  // Live workspace: no demo banner
  await expect(page.getByText(/Sample workspace — the business/)).toHaveCount(0);
});

test("a new user can open a private sample workspace", async ({ page }) => {
  await page.goto("/sign-up");
  await signUp(page, "Curious User", `curious.${Date.now()}@example.in`);
  await expect(page).toHaveURL(/onboarding/, { timeout: 30_000 });
  await page.getByText("Explore the sample workspace").click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
  await expect(page.getByText(/Sample workspace — the business/)).toBeVisible();
  await expect(page.getByText("Needs your attention")).toBeVisible();
});
