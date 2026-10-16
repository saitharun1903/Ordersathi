import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("main workflow fits a narrow mobile screen", async ({ page }) => {
  await signIn(page, "manager");
  const noHorizontalScroll = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await noHorizontalScroll();
  await page.getByRole("link", { name: "New order" }).first().click();
  await page.getByRole("tab", { name: /Voice note/ }).click();
  await page.getByRole("button", { name: /Use sample: Voice note/ }).click();
  await page.getByRole("button", { name: "Process order" }).click();
  await expect(page).toHaveURL(/\/orders\/c/, { timeout: 30_000 });
  await expect(page.getByRole("tab", { name: /^Order/ })).toBeVisible();
  await expect(page.getByText("Brand not specified — both Anchor and Havells sockets match")).toBeVisible();
  await noHorizontalScroll();
  await page.getByRole("tab", { name: /Source/ }).click();
  await expect(page.getByLabel("Transcript", { exact: true })).toHaveValue(/Sai Electricals/);
  await page.getByRole("tab", { name: /^Order/ }).click();
  await page.getByRole("button", { name: /Anchor · 6A/ }).click();
  await expect(page.getByText("All items confirmed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: /Approve · ₹/ }).click();
  await expect(page.getByText(/Approved by/)).toBeVisible();
  await noHorizontalScroll();
});
