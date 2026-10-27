import { ipc, systemSettings } from "@mobrowser/api";
import { i18n as i18nCommon, getI18nStrings } from "./infrastructure";
import { validated } from "./ipc/ipc_validation";
import { I18nServiceDescriptor } from "./gen/ipc_service";
import { i18nEvents } from "./ipc/events";
import { getLocaleSchema, getI18nStringsSchema } from "./ipc/ipc_schemas";
import type { Container } from "./container";

let containerRef: Container | null = null;
let onLanguageChangeCallback: (() => void) | null = null;

export function setContainer(container: Container): void {
	containerRef = container;
}

interface MainI18nParams {
	key: string;
}

export function i18n({ key }: MainI18nParams): string {
	return i18nCommon({ key, locale: locale() });
}

export function locale(): string {
	if (containerRef !== null) {
		const settings = containerRef.settings.get();
		if (settings.language !== null) {
			return settings.language;
		}
	}
	return systemLocale();
}

export function setLanguageChangeCallback(callback: () => void): void {
	onLanguageChangeCallback = callback;
}

export function rebuildMenusForLanguageChange(): void {
	onLanguageChangeCallback?.();
}

// Electron's app.getLocale() returned a BCP 47 tag ("en-US"); the OS reports
// "en" (macOS), "en-US" (Windows) or "en_US.UTF-8" (Linux). Normalize to the
// tag form i18nLookup's regional -> base -> English fallback expects.
function systemLocale(): string {
	const code = systemSettings.languageCode.split(".")[0] ?? "";
	return code === "" ? "en" : code.replace(/_/g, "-");
}

export function setupI18nHandlers(): void {
	const getLocale = validated(getLocaleSchema, async () => {
		return locale();
	});

	const getStrings = validated(getI18nStringsSchema, async () => {
		return getI18nStrings();
	});

	ipc.registerService(I18nServiceDescriptor, {
		async GetLocale() {
			return { value: await getLocale(undefined) };
		},
		async GetStrings() {
			const strings = await getStrings(undefined);
			return {
				strings: Object.fromEntries(
					Object.entries(strings).map(([key, locales]) => [key, { locales }]),
				),
			};
		},
	});
}

// Called when settings change to detect language changes and rebuild menus
export function handleLanguageChange(
	previousLanguage: string | null,
	newLanguage: string | null,
): void {
	if (previousLanguage === newLanguage) return;

	rebuildMenusForLanguageChange();

	// Broadcast language change to renderer
	i18nEvents.OnLanguageChanged({ value: locale() });
}
