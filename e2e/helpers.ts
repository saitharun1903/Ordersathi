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

/** Creates an account, backing off if the sign-up rate limiter kicks in. */
export async function signUp(page: Page, name: string, email: string, password = "a-strong-password") {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!page.url().includes("/sign-up")) await page.goto("/sign-up");
    await page.getByLabel("Your name").fill(name);
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    const outcome = await Promise.race([
      page.waitForURL((u) => !u.pathname.startsWith("/sign-up"), { timeout: 30_000 }).then(() => "ok"),
      page.getByText(/Too many/).waitFor({ timeout: 30_000 }).then(() => "limited"),
    ]);
    if (outcome === "ok") return;
    await page.waitForTimeout(15_000);
  }
  throw new Error("Sign-up kept being rate limited");
}
