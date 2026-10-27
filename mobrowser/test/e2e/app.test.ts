import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@mobrowser/cli/e2e";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "sample.jpg");

test("the empty state renders the i18n strings fetched over ipc", async ({
	page,
}) => {
	await expect(
		page.getByRole("heading", { name: "Add files to clean" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Choose files…" }),
	).toBeVisible();
});

test("a file chosen in the native dialog is cleaned into a copy", async ({
	page,
	app,
}, testInfo) => {
	const filePath = testInfo.outputPath("photo.jpg");
	copyFileSync(FIXTURE, filePath);

	await app.answerDialog({ paths: [filePath] });
	await page.getByRole("button", { name: "Choose files…" }).click();

	await expect(
		page.getByRole("row", { name: /photo\.jpg\. Metadata removed/ }),
	).toBeVisible();
	expect(existsSync(testInfo.outputPath("photo_cleaned.jpg"))).toBe(true);
	const { dialogs } = await app.dialogs();
	expect(dialogs[0]?.type).toBe("open");
});

test("choosing a language in Settings relabels the window live", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Open settings" }).click();
	await page.getByRole("button", { name: "System" }).click();
	await page.getByRole("option", { name: /^Deutsch/ }).click();

	await expect(
		page.getByRole("switch", { name: "Ausrichtung beibehalten" }),
	).toBeVisible();
});
