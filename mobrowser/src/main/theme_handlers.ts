import { app, ipc, systemSettings } from "@mobrowser/api";
import { validated } from "./ipc/ipc_validation";
import {
	themeGetSchema,
	themeSetSchema,
	themeAccentColorSchema,
} from "./ipc/ipc_schemas";
import { ThemeServiceDescriptor } from "./gen/ipc_service";
import { themeEvents } from "./ipc/events";
import { parseAccentColorHex, ACCENT_COLOR_FALLBACK } from "./domain";
import type { SettingsService } from "./infrastructure";

// systemSettings.accentColor is "#RRGGBBAA", the same shape Electron's
// systemPreferences.getAccentColor() returned without the "#"; empty on Linux.
function getAccentColorHex(): string {
	const raw = systemSettings.accentColor.replace(/^#/, "");
	return raw === "" ? ACCENT_COLOR_FALLBACK : parseAccentColorHex({ raw });
}

// Electron's nativeTheme.shouldUseDarkColors: the app theme when forced,
// otherwise the appearance the OS resolved.
function shouldUseDarkColors(): boolean {
	return app.theme === "system"
		? systemSettings.effectiveAppearance === "dark"
		: app.theme === "dark";
}

export function publishThemeChanged(): void {
	themeEvents.OnChanged({ shouldUseDarkColors: shouldUseDarkColors() });
}

export function setupThemeHandlers({
	settingsService,
}: {
	settingsService?: SettingsService;
}): void {
	const get = validated(themeGetSchema, async () => {
		return { shouldUseDarkColors: shouldUseDarkColors() };
	});

	const set = validated(themeSetSchema, async (mode) => {
		app.setTheme(mode);
		publishThemeChanged();
		if (settingsService) {
			await settingsService.update({ partial: { themeMode: mode } });
		}
		return { success: true };
	});

	const getAccentColor = validated(themeAccentColorSchema, async () => {
		return { color: getAccentColorHex() };
	});

	ipc.registerService(ThemeServiceDescriptor, {
		async Get() {
			return get(undefined);
		},
		async Set({ mode }) {
			return set(mode);
		},
		async GetAccentColor() {
			return getAccentColor(undefined);
		},
	});

	systemSettings.on("effectiveAppearanceChanged", () => {
		publishThemeChanged();
	});

	systemSettings.on("accentColorChanged", () => {
		themeEvents.OnAccentColorChanged({ color: getAccentColorHex() });
	});
}
