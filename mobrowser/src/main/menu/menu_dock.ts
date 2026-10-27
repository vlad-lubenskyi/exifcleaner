import { CheckboxMenuItem, Menu, MenuItem } from "@mobrowser/api";
import { fileMenuOpenItem } from "./menu_file_open";
import { i18n } from "../i18n";
import { settingsEvents } from "../ipc/events";
import { LANGUAGE_NAMES } from "../domain";
import { restoreWindowAndFocus } from "../infrastructure";

// Set by init.ts to avoid circular dependency with container
let onLanguageChange: ((code: string | null) => Promise<void>) | null = null;
let getLanguageSetting: (() => string | null) | null = null;

export function setDockLanguageChangeHandler(
	handler: (code: string | null) => Promise<void>,
): void {
	onLanguageChange = handler;
}

export function setDockLanguageSettingGetter(
	getter: () => string | null,
): void {
	getLanguageSetting = getter;
}

// MōBrowser has no radio items: checkboxes stand in for them, and the menus
// are rebuilt after every change so exactly one stays checked.
function dockLanguageSubmenu(): Menu {
	const settingValue = getLanguageSetting?.() ?? null;

	const languageItems = LANGUAGE_NAMES.map(
		(lang) =>
			new CheckboxMenuItem({
				id: `dock-language-${lang.code}`,
				label: lang.nativeName,
				checked: settingValue === lang.code,
				action: () => {
					void onLanguageChange?.(lang.code);
				},
			}),
	);

	return new Menu({
		label: i18n({ key: "language" }) || "Language",
		items: [
			new CheckboxMenuItem({
				id: "dock-language-system",
				label: `${i18n({ key: "languageSystem" }) || "System"}`,
				checked: settingValue === null,
				action: () => {
					void onLanguageChange?.(null);
				},
			}),
			"separator",
			...languageItems,
		],
	});
}

export function dockMenuTemplate(): Menu["items"] {
	return [
		fileMenuOpenItem(),
		new MenuItem({
			id: "dock-settings",
			label: `${i18n({ key: "menu.app.settings" })}…`,
			action: () => {
				restoreWindowAndFocus({ browserWindow: null });
				settingsEvents.OnToggle({});
			},
		}),
		dockLanguageSubmenu(),
	];
}
