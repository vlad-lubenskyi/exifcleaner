import { Menu } from "@mobrowser/api";
import { i18n } from "../i18n";
import { isMac } from "../common";

// Minimize and Zoom are role items labelled by MōBrowser. Electron's macOS
// "Bring All to Front" and window list roles have no counterpart.
export function windowMenuTemplate(): Menu {
	return new Menu({
		label: i18n({ key: "menu.window.name" }),
		items: [
			"minimizeWindow",
			"maximizeWindow",
			...(isMac() ? [] : (["closeWindow"] as const)),
		],
	});
}
