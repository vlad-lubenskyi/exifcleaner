import { app, type BrowserWindow } from "@mobrowser/api";
import { preloadI18nStrings } from "./infrastructure";
import {
	setupI18nHandlers,
	setContainer,
	setLanguageChangeCallback,
} from "./i18n";
import { setupMenus } from "./menu/menu";
import { setupExifHandlers } from "./exif_handlers";
import { setupFolderHandlers } from "./folder_handlers";
import {
	setLanguageChangeHandler,
	setLanguageSettingGetter,
	setThemeChangeHandler,
	setThemeSettingGetter,
} from "./menu/menu_view";
import {
	setDockLanguageChangeHandler,
	setDockLanguageSettingGetter,
} from "./menu/menu_dock";
import {
	setupSettingsHandlers,
	updateSettingsAndNotify,
} from "./settings_handlers";
import { setupThemeHandlers } from "./theme_handlers";
import { setupRevealHandlers } from "./reveal_handlers";
import { setupContextMenu } from "./window/context_menu";
import { setupDockEventHandlers } from "./lifecycle/dock";
import { setupApp } from "./lifecycle/app_setup";
import { createContainer, initContainer } from "./container";
import type { Container } from "./container";
import { hardenNavigation } from "./security/navigation";
import { installPermissionGate } from "./security/permissions";
import { currentBrowserWindow } from "./infrastructure";

let processInitialization: Promise<Container> | null = null;

function getActiveBrowserWindow(): BrowserWindow | null {
	return currentBrowserWindow({ browserWindow: null });
}

// Attach security state that belongs to one window lifetime. The Electron
// sender allowlist is gone: MōBrowser checks the frame origin of every ipc call.
export function attachWindow(browserWindow: BrowserWindow): void {
	hardenNavigation(browserWindow);
	installPermissionGate(browserWindow);
	setupContextMenu(browserWindow);
}

async function initializeProcess(): Promise<Container> {
	const container = createContainer();
	await initContainer(container);

	setContainer(container);

	// Wire menu rebuild callback for language changes (breaks i18n.ts -> menu.ts cycle)
	setLanguageChangeCallback(() => setupMenus());

	// Wire language change handler for View menu and dock menu
	const languageChangeHandler = async (code: string | null): Promise<void> => {
		await updateSettingsAndNotify({
			container,
			partial: { language: code },
		});
		// Checkbox items stand in for radio items: rebuild to move the check.
		setupMenus();
	};
	const languageSettingGetter = (): string | null =>
		container.settings.get().language;
	setLanguageChangeHandler(languageChangeHandler);
	setLanguageSettingGetter(languageSettingGetter);
	setDockLanguageChangeHandler(languageChangeHandler);
	setDockLanguageSettingGetter(languageSettingGetter);

	// Wire theme change handler for View menu (same callback injection pattern as language)
	setThemeChangeHandler((mode) => {
		container.settings.update({ partial: { themeMode: mode } });
		setupMenus();
	});
	setThemeSettingGetter(() => container.settings.get().themeMode);

	preloadI18nStrings();
	setupI18nHandlers();
	setupExifHandlers({ container });
	setupFolderHandlers({ container, getWindow: getActiveBrowserWindow });
	setupSettingsHandlers({ container });
	setupThemeHandlers({ settingsService: container.settings });
	setupRevealHandlers();
	setupDockEventHandlers();
	setupApp({
		onQuit: () => void container.exiftoolProcess.close(),
	});
	// MōBrowser persists app.theme itself; settings.json stays the source of
	// truth, as nativeTheme.themeSource did not survive an Electron restart.
	app.setTheme(container.settings.get().themeMode);

	return container;
}

/** Initialize process-wide services and handlers exactly once. */
export function initProcess(): Promise<Container> {
	if (processInitialization === null) {
		processInitialization = initializeProcess().catch((error: unknown) => {
			processInitialization = null;
			throw error;
		});
	}
	return processInitialization;
}
