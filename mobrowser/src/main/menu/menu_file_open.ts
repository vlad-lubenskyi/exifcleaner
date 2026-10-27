import { MenuItem } from "@mobrowser/api";
import { i18n } from "../i18n";
import { fileOpen } from "../file_open";

export function fileMenuOpenItem(): MenuItem {
	return new MenuItem({
		id: "file-open",
		label: `${i18n({ key: "menu.file.open" })}…`,
		shortcut: "CommandOrControl+O",
		action: () => fileOpen({ browserWindow: null }),
	});
}
