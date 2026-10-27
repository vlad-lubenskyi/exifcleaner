import { app } from "@mobrowser/api";
import { setupMenus } from "./menu/menu";
import { attachWindow, initProcess } from "./init";
import { createMainWindow, setupMainWindow } from "./window/window_setup";
import { currentBrowserWindow } from "./infrastructure";

// MōBrowser runs this module once the application is ready (Electron's
// app.whenReady()). The services are registered before the window exists, so
// the renderer never calls a service that does not exist yet, and the window
// opens straight on app.url instead of navigating away from a blank page.
async function createAndShowWindow(): Promise<void> {
	await initProcess();
	const browserWindow = createMainWindow();
	attachWindow(browserWindow);
	setupMenus();
	setupMainWindow(browserWindow);
}

async function setup(): Promise<void> {
	await createAndShowWindow();

	// macOS: re-create window when dock icon clicked and all windows are closed
	app.on("activated", async () => {
		if (currentBrowserWindow({ browserWindow: null }) === null) {
			await createAndShowWindow();
		}
	});
}

setup();
