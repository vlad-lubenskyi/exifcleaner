import { app, dock, Menu } from "@mobrowser/api";
import { isMac } from "../common";
import { currentBrowserWindow } from "../infrastructure";
import { appMenuTemplate } from "./menu_app";
import { dockMenuTemplate } from "./menu_dock";
import { editMenuTemplate } from "./menu_edit";
import { fileMenuTemplate } from "./menu_file";
import { helpMenuTemplate } from "./menu_help";
import { viewMenuTemplate } from "./menu_view";
import { windowMenuTemplate } from "./menu_window";

function menuTemplate(): Menu["items"] {
	return [
		...(isMac() ? [appMenuTemplate()] : []),
		fileMenuTemplate(),
		editMenuTemplate(),
		viewMenuTemplate(),
		windowMenuTemplate(),
		helpMenuTemplate(),
	];
}

function menu(): Menu {
	return new Menu({ items: menuTemplate() });
}

// On macOS the menu belongs to the application; on Windows and Linux each
// window owns its menu bar (Electron's Menu.setApplicationMenu did both).
function setupMainMenu(): void {
	if (isMac()) {
		app.setMenu(menu());
		return;
	}

	currentBrowserWindow({ browserWindow: null })?.setMenu(menu());
}

function setupDockMenu(): void {
	if (!isMac()) {
		return;
	}

	dock.setMenu(new Menu({ items: dockMenuTemplate() }));
}

// Electron's Windows jump-list task (app.setUserTasks, "--open-file") has no
// MōBrowser counterpart and is not ported.
export function setupMenus(): void {
	setupMainMenu();
	setupDockMenu();
}
