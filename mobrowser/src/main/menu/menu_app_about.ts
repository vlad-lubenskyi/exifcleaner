import { app } from "@mobrowser/api";
import { currentBrowserWindow } from "../infrastructure";
import { i18n } from "../i18n";

// MōBrowser has no native About panel (Electron's app.showAboutPanel), so the
// same facts are shown in a native message dialog.
export function showAboutWindow(author: string, websiteUrl: string): void {
	const win = currentBrowserWindow({ browserWindow: null });
	void app.showMessageDialog({
		...(win ? { parentWindow: win } : {}),
		type: "info",
		title: app.name,
		message: `${app.name} ${app.version}`,
		informativeText: `${i18n({ key: "aboutwindow:copyright" })} © ${author}\n${websiteUrl}`,
		buttons: [{ label: "OK", type: "primary" }],
	});
}
