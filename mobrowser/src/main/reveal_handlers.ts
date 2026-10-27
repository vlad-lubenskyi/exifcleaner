import { app, ipc, workspace } from "@mobrowser/api";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { validated } from "./ipc/ipc_validation";
import {
	fileRevealSchema,
	fileRevealContextMenuSchema,
} from "./ipc/ipc_schemas";
import { RevealServiceDescriptor } from "./gen/ipc_service";
import { currentBrowserWindow } from "./infrastructure";
import { i18n } from "./i18n";

export function setupRevealHandlers(): void {
	// Simple reveal: show file in system file manager
	const showInFolder = validated(fileRevealSchema, async (filePath: string) => {
		if (!existsSync(filePath)) {
			return { success: false, error: "File no longer exists" };
		}
		workspace.showPath(filePath);
		return { success: true };
	});

	// Reveal choice for save-as-copy mode (per D-21). MōBrowser can only show a
	// native context menu in answer to Chromium's own context-menu request, and
	// the renderer cancels that request for the reveal button, so the two
	// choices are offered in a native message dialog instead.
	const showContextMenu = validated(
		fileRevealContextMenuSchema,
		async ({ cleanedPath, originalPath }) => {
			const win = currentBrowserWindow({ browserWindow: null });
			if (win === null) return { success: false };

			const cleanedCopy = {
				label: i18n({ key: "reveal.cleanedCopy" }),
				type: "primary" as const,
			};
			const original = {
				label: i18n({ key: "reveal.original" }),
				type: "regular" as const,
			};
			const { button } = await app.showMessageDialog({
				parentWindow: win,
				type: "question",
				message: basename(originalPath),
				buttons: [
					cleanedCopy,
					original,
					// strings.json has no generic Cancel string; the Electron context menu
					// hardcoded its English labels too.
					{ label: "Cancel", type: "secondary" },
				],
			});
			const target =
				button.label === cleanedCopy.label
					? cleanedPath
					: button.label === original.label
						? originalPath
						: undefined;
			if (target !== undefined && existsSync(target)) {
				workspace.showPath(target);
			}
			return { success: true };
		},
	);

	ipc.registerService(RevealServiceDescriptor, {
		async ShowInFolder({ path }) {
			return showInFolder(path);
		},
		async ShowContextMenu(targets) {
			return showContextMenu(targets);
		},
	});
}
