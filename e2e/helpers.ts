import { expect, type Page } from "@playwright/test";

/** Signs in with a demo account. Backs off if the auth rate limiter (a real protection) kicks in. */
export async function signIn(page: Page, who: "owner" | "manager" | "operator") {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(`${who}@demo.ordersathi.in`);
    await page.getByLabel("Password", { exact: true }).fill("ordersathi-demo");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    const outcome = await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 30_000 }).then(() => "ok"),
      page.getByText(/Too many attempts/).waitFor({ timeout: 30_000 }).then(() => "limited"),
    ]);
    if (outcome === "ok") return;
    await page.waitForTimeout(15_000);
  }
  await expect(page).toHaveURL(/dashboard/);
}
