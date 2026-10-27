import { Menu } from "@mobrowser/api";
import { i18n } from "../i18n";

// Copy and Select All are role items labelled by MōBrowser. Electron's macOS
// Speech submenu has no counterpart.
export function editMenuTemplate(): Menu {
	return new Menu({
		label: i18n({ key: "menu.edit.name" }),
		items: ["copy", "selectAll"],
	});
}
