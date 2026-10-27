import { app, ipc, type BrowserWindow } from "@mobrowser/api";
import { stat } from "node:fs/promises";
import type { Container } from "./container";
import { validated } from "./ipc/ipc_validation";
import {
	filesChooseSchema,
	folderChooseSchema,
	folderClassifySchema,
	folderExpandSchema,
} from "./ipc/ipc_schemas";
import {
	FilesServiceDescriptor,
	FolderServiceDescriptor,
} from "./gen/ipc_service";
import { logError } from "./common";
import type { ClassifiedFile } from "./common/ipc_channels";
import { formatFolderError } from "./domain";

export function setupFolderHandlers({
	container,
	getWindow,
}: {
	container: Container;
	getWindow: () => BrowserWindow | null;
}): void {
	const chooseFiles = validated(filesChooseSchema, async () => {
		const window = getWindow();
		const result = await app.showOpenDialog({
			...(window ? { parentWindow: window } : {}),
			selectionPolicy: "files",
			features: { allowMultiple: true },
		});
		return result.canceled
			? []
			: result.paths.filter((path) => !/[\r\n]/u.test(path));
	});

	const chooseFolder = validated(folderChooseSchema, async () => {
		const window = getWindow();
		const result = await app.showOpenDialog({
			...(window ? { parentWindow: window } : {}),
			selectionPolicy: "directories",
		});
		const selectedPath = result.canceled ? undefined : result.paths[0];
		return selectedPath !== undefined && !/[\r\n]/u.test(selectedPath)
			? selectedPath
			: null;
	});

	const classify = validated(folderClassifySchema, async (paths) => {
		const files: ClassifiedFile[] = [];
		const folders: string[] = [];

		for (const p of paths) {
			try {
				const s = await stat(p);
				if (s.isDirectory()) {
					folders.push(p);
				} else if (s.isFile()) {
					// s.size comes free with the stat already needed for isFile().
					files.push({ path: p, size: s.size });
				}
			} catch (err: unknown) {
				// Skip inaccessible paths (ENOENT, EPERM) — expected for stale drag-drop
				logError("folder:classify", err);
			}
		}

		return { files, folders };
	});

	const expand = validated(folderExpandSchema, async (dirPath) => {
		const result = await container.expandFolder.execute({ dirPath });

		if (result.ok) {
			return {
				files: result.value.files,
				skippedCount: result.value.skippedCount,
			};
		}

		return {
			files: [],
			skippedCount: 0,
			error: formatFolderError(result.error),
		};
	});

	ipc.registerService(FilesServiceDescriptor, {
		async ChooseFiles() {
			return { paths: await chooseFiles(undefined) };
		},
		async ChooseFolder() {
			const path = await chooseFolder(undefined);
			return path === null ? {} : { path };
		},
	});

	ipc.registerService(FolderServiceDescriptor, {
		async Classify({ paths }) {
			return classify(paths);
		},
		async Expand({ path }) {
			return expand(path);
		},
	});
}
