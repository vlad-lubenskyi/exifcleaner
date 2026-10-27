import { app, BrowserWindow } from "@mobrowser/api";
import { setMainBrowserWindow } from "../infrastructure";
import { loadWindowState, setupWindowStatePersistence } from "./window_state";

const DEFAULT_WINDOW_WIDTH = 580;
const DEFAULT_WINDOW_HEIGHT = 312;

// Electron's "closed" handler quit the app on Windows and Linux; MōBrowser
// already quits when the last window closes there and keeps running on macOS.
function setupMainWindowClose(browserWindow: BrowserWindow) {
	browserWindow.on("closed", () => {
		setMainBrowserWindow(null);
	});
}

export function createMainWindow(): BrowserWindow {
	const savedState = loadWindowState();

	// No webPreferences: MōBrowser renderers are always sandboxed, isolated and
	// without Node.js. No preload: the renderer reaches the main process only
	// through the generated ipc clients (src/renderer/gen/ipc.ts).
	const win = new BrowserWindow({
		title: app.name,
		// app.url serves the Vite dev server in `npm run dev` and the bundled
		// renderer (mobrowser://app/index.html) otherwise.
		url: app.url,
		size: { width: savedState.width, height: savedState.height },
		...(savedState.x !== undefined && savedState.y !== undefined
			? { position: { x: savedState.x, y: savedState.y } }
			: {}),
		minimumSize: {
			width: DEFAULT_WINDOW_WIDTH,
			height: DEFAULT_WINDOW_HEIGHT + 25,
		},
		maximized: savedState.isMaximized,
	});
	setMainBrowserWindow(win);

	return win;
}

export function setupMainWindow(browserWindow: BrowserWindow): void {
	setupMainWindowClose(browserWindow);
	setupWindowStatePersistence(browserWindow);
	browserWindow.show();
	browserWindow.focus();
}
