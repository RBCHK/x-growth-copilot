import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "path";

setup.describe.configure({ mode: "serial" });

setup("clerk setup", async () => {
  await clerkSetup();

  if (!process.env.E2E_CLERK_USER_USERNAME || !process.env.E2E_CLERK_USER_PASSWORD) {
    throw new Error(
      "E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD env vars are required for E2E tests."
    );
  }
});

const authFile = path.join(__dirname, ".auth/user.json");

// Clerk test emails use +clerk_test suffix and verify with code 424242
// See: https://clerk.com/docs/testing/test-emails-and-phones
const TEST_VERIFICATION_CODE = "424242";

setup("authenticate", async ({ page }) => {
  await page.goto("/sign-in");

  // Fill email and click Continue
  const emailInput = page.getByRole("textbox", { name: /email/i });
  await emailInput.waitFor({ timeout: 15_000 });
  await emailInput.fill(process.env.E2E_CLERK_USER_USERNAME!);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Fill password and click Continue
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ timeout: 10_000 });
  await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD!);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Handle device verification (factor-two) if it appears
  const factorTwoOrHome = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.includes("/sign-in"), { timeout: 10_000 })
      .then(() => "home" as const),
    page.waitForURL("**/sign-in/factor-two", { timeout: 10_000 }).then(() => "factor-two" as const),
  ]);

  if (factorTwoOrHome === "factor-two") {
    // Type the verification code — Clerk auto-submits when all digits are entered
    await page.waitForTimeout(500);
    await page.keyboard.type(TEST_VERIFICATION_CODE);

    // Wait for redirect (Clerk auto-submits OTP)
    await page.waitForURL((url) => !url.pathname.includes("/sign-in"), { timeout: 15_000 });
  }

  // Verify we're authenticated
  expect(page.url()).not.toContain("/sign-in");

  await page.context().storageState({ path: authFile });
});
