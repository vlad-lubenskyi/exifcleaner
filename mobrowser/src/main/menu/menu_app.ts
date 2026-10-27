import { app, MenuItem, MenuWithRole } from "@mobrowser/api";
import { i18n } from "../i18n";
import { settingsEvents } from "../ipc/events";
import { showAboutWindow } from "./menu_app_about";
import { GITHUB_USERNAME, WEBSITE_URL } from "./menu_help";

// Role items (Hide, Hide Others, Show All, Quit) are labelled by MōBrowser in
// the system language (app.locales in mobrowser.conf.json), not by strings.json.
// Electron's Services submenu has no counterpart.
export function appMenuTemplate(): MenuWithRole {
	return new MenuWithRole({
		role: "macAppMenu",
		items: [
			new MenuItem({
				id: "about",
				label: `${i18n({ key: "menu.app.about" })}${app.name}`,
				action: () => showAboutWindow(GITHUB_USERNAME, WEBSITE_URL),
			}),
			"separator",
			new MenuItem({
				id: "settings",
				label: `${i18n({ key: "menu.app.settings" })}…`,
				shortcut: "CommandOrControl+,",
				action: () => settingsEvents.OnToggle({}),
			}),
			"separator",
			"macHideApp",
			"macHideOthers",
			"macShowAll",
			"separator",
			"quit",
		],
	});
}
