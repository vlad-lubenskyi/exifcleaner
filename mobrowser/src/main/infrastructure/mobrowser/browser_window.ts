import type { BrowserWindow } from "@mobrowser/api";

// Replaces Electron's BrowserWindow.getAllWindows()[0]: the main window
// registers itself here (see window_setup.ts), so helpers never pick up
// another window from app.windows.
let mainWindow: BrowserWindow | null = null;

export function setMainBrowserWindow(
	browserWindow: BrowserWindow | null,
): void {
	mainWindow = browserWindow;
}

interface BrowserWindowParam {
	browserWindow: BrowserWindow | null | undefined;
}

export function currentBrowserWindow({
	browserWindow,
}: BrowserWindowParam): BrowserWindow | null {
	if (!browserWindow) {
		browserWindow = mainWindow?.isClosed === false ? mainWindow : null;
	}

	return browserWindow;
}

export function defaultBrowserWindow({
	browserWindow,
}: BrowserWindowParam): BrowserWindow {
	if (!browserWindow) {
		browserWindow = currentBrowserWindow({ browserWindow });
		if (!browserWindow) {
			throw new Error(
				"Could not load file open menu because browser window was not initialized.",
			);
		}
	}

	return browserWindow;
}

export function restoreWindowAndFocus({
	browserWindow,
}: BrowserWindowParam): void {
	browserWindow = defaultBrowserWindow({ browserWindow });
	if (browserWindow.isMinimized) {
		browserWindow.restore();
	}
	browserWindow.show();
	browserWindow.focus();
}
