import { app, type BrowserWindow } from "@mobrowser/api";
import { defaultBrowserWindow, restoreWindowAndFocus } from "./infrastructure";
import { filesEvents } from "./ipc/events";

interface FileOpenParams {
	browserWindow: BrowserWindow | undefined | null;
}

export function fileOpen({ browserWindow }: FileOpenParams): void {
	const win = defaultBrowserWindow({ browserWindow });
	restoreWindowAndFocus({ browserWindow: win });

	app
		.showOpenDialog({
			parentWindow: win,
			selectionPolicy: "files",
			features: { allowMultiple: true },
		})
		.then((result) => {
			if (!result.canceled) {
				filesEvents.OnFileOpenAddFiles({ paths: result.paths });
			}
		});
}
