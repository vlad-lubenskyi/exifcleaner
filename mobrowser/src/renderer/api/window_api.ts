// Replaces the Electron preload script (src/preload/index.ts). MōBrowser has
// no preload: the renderer talks to the main process through the clients
// generated from proto/*.proto (`npm run gen`). This module rebuilds the same
// `window.api` the renderer used under Electron on top of those clients, so
// components, hooks and contexts run unchanged.
import { ipc } from "../gen/ipc";
import type {
	Settings as SettingsMessage,
	SettingsPatch,
} from "../gen/settings";
import type { RemoveMetadataResult as RemoveMetadataResultMessage } from "../gen/exif";
import type { Settings, ThemeMode } from "../../main/domain";
import type { RemoveMetadataResult } from "../../main/common/ipc_channels";
import type { WindowApi } from "./api_types";

function basename(filePath: string): string {
	const normalized = filePath.replace(/\\/g, "/");
	const parts = normalized.split("/");
	return parts[parts.length - 1] || filePath;
}

const VALID_THEME_MODES = new Set(["light", "dark", "system"]);

function isThemeMode(value: unknown): value is ThemeMode {
	return typeof value === "string" && VALID_THEME_MODES.has(value);
}

function reportError(error: unknown): void {
	console.error(error);
}

// Turns a server stream into the `(callback) => unsubscribe` shape of the
// Electron ipcRenderer.on wrappers.
function listen<T>(
	stream: {
		subscribe(observer: {
			next: (value: T) => void;
			error: (error: unknown) => void;
		}): { unsubscribe(): void };
	},
	next: (value: T) => void,
): () => void {
	const subscription = stream.subscribe({ next, error: reportError });
	return () => subscription.unsubscribe();
}

function fromSettingsMessage(message: SettingsMessage): Settings {
	return {
		preserveOrientation: message.preserveOrientation,
		preserveColorProfile: message.preserveColorProfile,
		preserveResolution: message.preserveResolution,
		saveAsCopy: message.saveAsCopy,
		removeXattrs: message.removeXattrs,
		preserveTimestamps: message.preserveTimestamps,
		language: message.language ?? null,
		themeMode: isThemeMode(message.themeMode) ? message.themeMode : "system",
	};
}

function toSettingsPatch(settings: Partial<Settings>): SettingsPatch {
	const { language, themeMode, ...flags } = settings;
	return {
		...flags,
		...(language === undefined || language === null ? {} : { language }),
		followSystemLanguage: language === null,
		...(themeMode === undefined ? {} : { themeMode }),
	};
}

// Rebuilds the discriminated union the main process flattened into a message.
function fromRemoveMetadataResult(
	message: RemoveMetadataResultMessage,
): RemoveMetadataResult {
	if (message.success) {
		return {
			success: true,
			outputPath: message.outputPath,
			wasForcedCopy: message.wasForcedCopy,
			wroteFile: message.wroteFile,
			outputSize: message.outputSize,
		};
	}
	switch (message.failureKind) {
		case undefined:
			return { success: false, error: message.error ?? "" };
		case "refused":
			return {
				success: false,
				failureKind: "refused",
				refusalReason: "unsafe-raf-write",
				detail: message.detail,
				originalPath: message.originalPath,
			};
		case "write":
		case "verification":
		case "cleanup":
		case "commit":
		case "xattr":
			return {
				success: false,
				failureKind: message.failureKind,
				detail: message.detail,
				...(message.residualPath === undefined
					? {}
					: { residualPath: message.residualPath }),
			};
		default:
			return {
				success: false,
				error: message.detail || `Unknown failure: ${message.failureKind}`,
			};
	}
}

const api: WindowApi = {
	exif: {
		readMetadata: async (filePath) =>
			(await ipc.exif.ReadMetadata({ path: filePath })).tags ?? {},
		removeMetadata: async (filePath) =>
			fromRemoveMetadataResult(
				await ipc.exif.RemoveMetadata({ path: filePath }),
			),
	},

	i18n: {
		getLocale: async () => (await ipc.i18n.GetLocale({})).value,
		getStrings: async () => {
			const { strings } = await ipc.i18n.GetStrings({});
			return Object.fromEntries(
				Object.entries(strings).map(([key, { locales }]) => [key, locales]),
			);
		},
		onLanguageChanged: (callback) =>
			listen(ipc.i18n.OnLanguageChanged({}), ({ value }) => callback(value)),
	},

	files: {
		basename,
		// MōBrowser 2.19 does not expose the absolute path of a dropped File (no
		// webUtils.getPathForFile counterpart). "" is what Electron returned for
		// a File that has no backing path; folder.classify skips such entries.
		getPathForFile: () => "",
		chooseFiles: async () => (await ipc.files.ChooseFiles({})).paths,
		chooseFolder: async () => (await ipc.files.ChooseFolder({})).path ?? null,
		// Fire-and-forget like ipcRenderer.send: never awaited by the pipeline.
		notifyFilesAdded: (count) =>
			void ipc.files.NotifyFilesAdded({ count }).catch(reportError),
		notifyFileProcessed: () =>
			void ipc.files.NotifyFileProcessed({}).catch(reportError),
		notifyAllFilesProcessed: () =>
			void ipc.files.NotifyAllFilesProcessed({}).catch(reportError),
		onFileOpenAddFiles: (callback) =>
			listen(ipc.files.OnFileOpenAddFiles({}), ({ paths }) => callback(paths)),
	},

	theme: {
		get: () => ipc.theme.Get({}),
		set: (mode) => ipc.theme.Set({ mode }),
		getAccentColor: () => ipc.theme.GetAccentColor({}),
		onChanged: (callback) => listen(ipc.theme.OnChanged({}), callback),
		onAccentColorChanged: (callback) =>
			listen(ipc.theme.OnAccentColorChanged({}), callback),
		onThemeModeChanged: (callback) =>
			listen(ipc.theme.OnThemeModeChanged({}), ({ mode }) => {
				if (isThemeMode(mode)) {
					callback(mode);
				}
			}),
	},

	settings: {
		get: async () => fromSettingsMessage(await ipc.settings.Get({})),
		set: async (settings) => {
			const { success, error } = await ipc.settings.Set(
				toSettingsPatch(settings),
			);
			return { success, error: error ?? null };
		},
		onChanged: (callback) =>
			listen(ipc.settings.OnChanged({}), (message) =>
				callback(fromSettingsMessage(message)),
			),
		onToggle: (callback) => listen(ipc.settings.OnToggle({}), () => callback()),
	},

	reveal: {
		showInFolder: async (filePath) => {
			const { success, error } = await ipc.reveal.ShowInFolder({
				path: filePath,
			});
			return error === undefined ? { success } : { success, error };
		},
		showContextMenu: (paths) => ipc.reveal.ShowContextMenu(paths),
	},

	folder: {
		classify: async (paths) => {
			const filePaths = paths.filter((path) => path !== "");
			if (filePaths.length < paths.length) {
				console.warn(
					"[intake] Skipped dropped items without a file system path",
				);
			}
			return ipc.folder.Classify({ paths: filePaths });
		},
		expand: async (dirPath) => {
			const { files, skippedCount, error } = await ipc.folder.Expand({
				path: dirPath,
			});
			return error === undefined
				? { files, skippedCount }
				: { files, skippedCount, error };
		},
	},

	platform: {
		isMac: navigator.userAgent.includes("Mac"),
	},
};

window.api = api;
