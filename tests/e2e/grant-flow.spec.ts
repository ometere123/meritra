import { expect, test } from "@playwright/test";

test("commit-reveal lifecycle surfaces render", async ({ page }) => {
  // Landing
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("MERITRA").first()).toBeVisible();

  // Create-round wizard
  await page.goto("/create-round", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Grant Round Foundry")).toBeVisible();
  await expect(page.getByText("Round Title")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();

  // Submit-proposal page (commit phase)
  await page.goto("/rounds/demo-round/submit-proposal", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Submit Sealed Research Proposal" })).toBeVisible();
  await expect(page.getByText(/commit-reveal protocol/i)).toBeVisible();

  // Reveal dashboard
  await page.goto("/reveal", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Your Sealed Applications" })).toBeVisible();
  await expect(page.getByText(/commit-reveal protected/i)).toBeVisible();
});
