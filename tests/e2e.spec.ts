import { test, expect, Page } from "@playwright/test";

const USER_NAME = "Tester Disputer";
const CLIENT_NAME = "Tester Client";

async function login(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("dlcm_user", JSON.stringify({ name: "e2e" }));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible({ timeout: 30000 });
}

test("full CRUD across modules", async ({ page }) => {
  await login(page);

  // Users
  await page.getByRole("button", { name: "Users (Disputers)" }).click();
  await expect(page.getByRole("heading", { name: "Users (Disputers)" })).toBeVisible();
  const addUserButton = page.getByRole("button", { name: "+ Add User" });
  await expect(addUserButton).toBeVisible({ timeout: 30000 });
  await addUserButton.click();
  const userDialog = page.getByRole("dialog");
  await expect(userDialog).toBeVisible({ timeout: 5000 });
  await userDialog.getByLabel("Name").fill(USER_NAME);
  await userDialog.getByLabel("Email").fill("tester@example.com");
  await userDialog.getByLabel("Role").fill("Disputer");
  await userDialog.getByLabel("Status").selectOption("Active");
  await userDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(USER_NAME)).toBeVisible();

  // Clients
  await page.getByRole("button", { name: "Client Management" }).click();
  await page.getByRole("button", { name: "+ Add Client" }).click();
  const clientDialog = page.getByRole("dialog");
  await clientDialog.getByLabel("Name").fill(CLIENT_NAME);
  await clientDialog.getByLabel("Disputer").fill(USER_NAME);
  await clientDialog.getByLabel("Status").selectOption("Active");
  await clientDialog.getByLabel("Round").fill("1");
  await clientDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(CLIENT_NAME)).toBeVisible();

  // Issues
  await page.getByRole("button", { name: "Dues with Issues" }).click();
  await page.getByRole("button", { name: "+ Add Issue" }).click();
  const issueDialog = page.getByRole("dialog");
  await issueDialog.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await issueDialog.getByLabel("Issue type").fill("ID missing");
  await issueDialog.getByLabel("Note").fill("Please upload ID");
  await issueDialog.getByLabel("Message sent").check();
  await issueDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("ID missing")).toBeVisible();
  const issueRow = page.getByRole("row", { name: new RegExp(CLIENT_NAME) });
  await issueRow.getByRole("checkbox").check();
  await expect(issueRow.getByText("Resolved")).toBeVisible();
  await issueRow.getByRole("button", { name: "Edit" }).click();
  const issueEditDialog = page.getByRole("dialog");
  await issueEditDialog.getByLabel("Issue type").fill("ID missing updated");
  await issueEditDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("ID missing updated")).toBeVisible();
  await page.getByRole("row", { name: /ID missing updated/ }).getByRole("button", { name: "Delete" }).click();

  // Docs
  await page.getByRole("button", { name: "Document Trackers" }).click();
  await page.getByRole("button", { name: "+ Add Doc" }).click();
  const docDialog = page.getByRole("dialog");
  await docDialog.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await docDialog.getByLabel("Document type").fill("Passport");
  await docDialog.getByLabel("Category").selectOption("completing");
  await docDialog.getByLabel("Status").selectOption("pending");
  await docDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Passport")).toBeVisible();
  await page.getByRole("row", { name: /Passport/ }).getByRole("button", { name: "Edit" }).click();
  const docEditDialog = page.getByRole("dialog");
  await docEditDialog.getByLabel("Status").selectOption("received");
  await docEditDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("row", { name: /Passport/ }).getByText(/received/i)).toBeVisible();
  await page.getByRole("row", { name: /Passport/ }).getByRole("button", { name: "Delete" }).click();

  // Credit Monitoring
  await page.getByRole("button", { name: "Credit Monitoring" }).click();
  await page.getByRole("button", { name: "+ Add CM Issue" }).click();
  const cmDialog = page.getByRole("dialog");
  await cmDialog.getByLabel("Client").selectOption({ label: CLIENT_NAME });
  await cmDialog.getByLabel("Platform").fill("Smart Credit");
  await cmDialog.getByLabel("Issue").fill("Login error");
  await cmDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Login error")).toBeVisible();
  const cmRow = page.getByRole("row", { name: /Login error/ });
  await cmRow.getByRole("checkbox").check();
  await expect(cmRow.getByText("Resolved")).toBeVisible();
  await cmRow.getByRole("button", { name: "Delete" }).click();

  // Ready queue mark processed
  await page.getByRole("button", { name: "Ready to Process" }).click();
  const readyRow = page.getByRole("row", { name: new RegExp(CLIENT_NAME) });
  await readyRow.getByRole("button", { name: "Mark Processed" }).click();
  await expect(readyRow.getByText("2")).toBeVisible();

  // Clients delete
  await page.getByRole("button", { name: "Client Management" }).click();
  await page.getByRole("row", { name: new RegExp(CLIENT_NAME) }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(CLIENT_NAME)).not.toBeVisible({ timeout: 5000 });

  // Users delete
  await page.getByRole("button", { name: "Users (Disputers)" }).click();
  await page.getByRole("row", { name: new RegExp(USER_NAME) }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(USER_NAME)).not.toBeVisible({ timeout: 5000 });
});
