import { Menu, MenuItem } from "@mobrowser/api";
import { i18n } from "../i18n";
import { fileMenuOpenItem } from "./menu_file_open";
import { isMac } from "../common";
import { settingsEvents } from "../ipc/events";

export function fileMenuTemplate(): Menu {
	return new Menu({
		label: i18n({ key: "menu.file.name" }),
		items: [
			fileMenuOpenItem(),
			new MenuItem({
				id: "file-settings",
				label: `${i18n({ key: "menu.app.settings" })}…`,
				// macOS: the app menu's Settings… owns the shortcut.
				...(isMac() ? {} : { shortcut: "CommandOrControl+," }),
				action: () => settingsEvents.OnToggle({}),
			}),
			"separator",
			isMac() ? "closeWindow" : "quit",
		],
	});
}
