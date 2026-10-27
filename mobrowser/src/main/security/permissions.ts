import type { BrowserWindow } from "@mobrowser/api";

// MōBrowser grants framework permission requests from trusted origins
// automatically; this keeps Electron's deny-by-default gate instead.
export function installPermissionGate(win: BrowserWindow): void {
	win.browser.handle("requestPermissions", async ({ permissionType }) => {
		if (permissionType === "clipboard-sanitized-write") {
			return "grant";
		}
		console.warn(`[security] Denied permission: ${permissionType}`);
		return "deny";
	});
}
