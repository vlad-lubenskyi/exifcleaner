import { workspace } from "@mobrowser/api";
import type { BrowserWindow } from "@mobrowser/api";

// Accepts an optional openExternal function for testability.
// In production, defaults to workspace.openUrl.
export function hardenNavigation(
	win: BrowserWindow,
	openExternal?: (url: string) => void,
): void {
	const openUrl = openExternal ?? ((url: string) => workspace.openUrl(url));

	// Only the app's own content may load: the bundled renderer, or the Vite
	// dev server in `npm run dev` (both are trusted origins to MōBrowser).
	win.browser.handle("navigation", (params) => {
		if (params.isTrusted || params.isAppControlled) {
			return "proceed";
		}
		console.warn(`[security] Blocked navigation to: ${params.url}`);
		return "cancel";
	});

	win.browser.handle("openPopup", ({ url }) => {
		try {
			const parsed = new URL(url);
			if (parsed.protocol === "https:") {
				openUrl(url);
			}
		} catch {
			// Invalid URL, ignore
		}
		return "block";
	});
}
