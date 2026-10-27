import type { Settings, ThemeMode } from "../domain";
import type {
	Settings as SettingsMessage,
	SettingsPatch,
} from "../gen/settings";

// proto3 has no null: an absent `language` is the domain's `null`
// ("follow the system language").
export function toSettingsMessage(settings: Settings): SettingsMessage {
	return {
		preserveOrientation: settings.preserveOrientation,
		preserveColorProfile: settings.preserveColorProfile,
		preserveResolution: settings.preserveResolution,
		saveAsCopy: settings.saveAsCopy,
		removeXattrs: settings.removeXattrs,
		preserveTimestamps: settings.preserveTimestamps,
		...(settings.language === null ? {} : { language: settings.language }),
		themeMode: settings.themeMode,
	};
}

// Shapes a patch the way settingsSetSchema expects: only present keys,
// `language: null` when the renderer asked to follow the system language.
export function fromSettingsPatch(patch: SettingsPatch): {
	[K in keyof Settings]?: unknown;
} {
	const { followSystemLanguage, language, themeMode, ...flags } = patch;
	return {
		...Object.fromEntries(
			Object.entries(flags).filter(([, value]) => value !== undefined),
		),
		...(followSystemLanguage
			? { language: null }
			: language === undefined
				? {}
				: { language }),
		...(themeMode === undefined ? {} : { themeMode: themeMode as ThemeMode }),
	};
}
