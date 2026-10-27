import { expect, test } from "@mobrowser/cli/e2e"

test("the main window says hello and how to open Settings", async ({ page }) => {
  await expect(page.getByRole("main").getByText("Hello, world!", { exact: true })).toBeVisible()
  // The shortcut differs by platform (⌘, or Ctrl+,), so only the action is checked.
  await expect(page.getByRole("main").getByText(/to open Settings$/)).toBeVisible()
})
