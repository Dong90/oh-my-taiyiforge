// @ts-check
import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pageUrl = `file://${path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html")}`;

test("TaiyiForge browser smoke — title and increment", async ({ page }) => {
  await page.goto(pageUrl);
  await expect(page.getByRole("heading", { name: "TaiyiForge E2E Smoke" })).toBeVisible();
  await expect(page.getByTestId("count")).toHaveText("0");
  await page.getByTestId("increment").click();
  await page.getByTestId("increment").click();
  await expect(page.getByTestId("count")).toHaveText("2");
});
