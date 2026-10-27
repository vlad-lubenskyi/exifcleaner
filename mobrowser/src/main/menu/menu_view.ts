import { app, CheckboxMenuItem, Menu } from "@mobrowser/api";
import { i18n } from "../i18n";
import { themeEvents } from "../ipc/events";
import { publishThemeChanged } from "../theme_handlers";
import { LANGUAGE_NAMES } from "../domain";
import type { ThemeMode } from "../domain";

function broadcastThemeSet(mode: "light" | "dark" | "system"): void {
	themeEvents.OnThemeModeChanged({ mode });
}

// Set by init.ts to avoid circular dependency with container
let onLanguageChange: ((code: string | null) => Promise<void>) | null = null;
let getLanguageSetting: (() => string | null) | null = null;
let onThemeChange: ((mode: ThemeMode) => void) | null = null;
let getThemeSetting: (() => ThemeMode) | null = null;

export function setLanguageChangeHandler(
	handler: (code: string | null) => Promise<void>,
): void {
	onLanguageChange = handler;
}

export function setLanguageSettingGetter(getter: () => string | null): void {
	getLanguageSetting = getter;
}

export function setThemeChangeHandler(
	handler: (mode: ThemeMode) => void,
): void {
	onThemeChange = handler;
}

export function setThemeSettingGetter(getter: () => ThemeMode): void {
	getThemeSetting = getter;
}

// MōBrowser has no radio items: checkboxes stand in for them, and the menus
// are rebuilt after every change (init.ts) so exactly one stays checked.
function languageSubmenu(): Menu {
	// Get the raw setting (null = System, string = explicit language)
	const settingValue = getLanguageSetting?.() ?? null;

	const languageItems = LANGUAGE_NAMES.map(
		(lang) =>
			new CheckboxMenuItem({
				id: `language-${lang.code}`,
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
				id: "language-system",
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

function themeItem(mode: ThemeMode, label: string): CheckboxMenuItem {
	return new CheckboxMenuItem({
		id: `theme-${mode}`,
		label,
		checked: (getThemeSetting?.() ?? "system") === mode,
		action: () => {
			app.setTheme(mode);
			publishThemeChanged();
			broadcastThemeSet(mode);
			onThemeChange?.(mode);
		},
	});
}

// Zoom and Full Screen are role items labelled by MōBrowser. Developer Tools
// is development-only: packaged Electron builds disabled DevTools in
// webPreferences, which left the old menu item inert.
export function viewMenuTemplate(): Menu {
	return new Menu({
		label: i18n({ key: "menu.view.name" }),
		items: [
			new Menu({
				label: i18n({ key: "appearance" }) || "Appearance",
				items: [
					themeItem("light", i18n({ key: "themeLight" }) || "Light"),
					themeItem("system", i18n({ key: "themeAuto" }) || "Auto"),
					themeItem("dark", i18n({ key: "themeDark" }) || "Dark"),
				],
			}),
			languageSubmenu(),
			...(app.packaged ? [] : (["separator", "devTools"] as const)),
			"separator",
			"zoomReset",
			"zoomIn",
			"zoomOut",
			"separator",
			"fullScreen",
		],
	});
}
