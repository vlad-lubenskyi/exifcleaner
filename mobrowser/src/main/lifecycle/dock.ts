import { dock, ipc } from "@mobrowser/api";
import { isMac } from "../common";
import { validated } from "../ipc/ipc_validation";
import {
	filesAddedSchema,
	fileProcessedSchema,
	allFilesProcessedSchema,
} from "../ipc/ipc_schemas";
import { FilesServiceDescriptor } from "../gen/ipc_service";

let batchCount = 0;
let remainingCount = 0;

// MōBrowser 2.19 has the macOS Dock badge but no equivalent of Electron's
// taskbar progress bar, Dock bounce, Windows frame flashing or taskbar overlay
// icon, so batch progress is shown on the Dock badge only.
export function setupDockEventHandlers(): void {
	const filesAdded = validated(filesAddedSchema, async (filesCount) => {
		storeBatchCount(filesCount);

		updateDockCount();
	});

	const fileProcessed = validated(fileProcessedSchema, async () => {
		storeFilesCount(remainingCount - 1);

		// if there are none remaining, let the all finished
		// event take care of it so we don't double up
		if (remainingCount > 0) {
			updateDockCount();
		}
	});

	const allFilesProcessed = validated(allFilesProcessedSchema, async () => {
		storeBatchCount(0);

		updateDockCount();
	});

	ipc.registerService(FilesServiceDescriptor, {
		async NotifyFilesAdded({ count }) {
			await filesAdded(count);
			return {};
		},
		async NotifyFileProcessed() {
			await fileProcessed(undefined);
			return {};
		},
		async NotifyAllFilesProcessed() {
			await allFilesProcessed(undefined);
			return {};
		},
	});
}

function storeBatchCount(filesCount: number) {
	batchCount = filesCount;
	storeFilesCount(batchCount);
}

function storeFilesCount(filesCount: number): void {
	remainingCount = filesCount > 0 ? filesCount : 0;
}

function updateDockCount(): void {
	if (!isMac()) {
		return;
	}

	// update badge count
	dock.setBadgeText(remainingCount > 0 ? remainingCount.toString() : "");
}
