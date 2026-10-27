import { ipc } from "@mobrowser/api";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import type { Container } from "./container";
import { validated } from "./ipc/ipc_validation";
import { ExifServiceDescriptor } from "./gen/ipc_service";
import type { RemoveMetadataResult as RemoveMetadataResultMessage } from "./gen/exif";
import type { RemoveMetadataResult } from "./common/ipc_channels";
import { exifReadSchema, exifRemoveSchema } from "./ipc/ipc_schemas";
import { formatExifError } from "./domain";
import { generateCleanedPath } from "./domain/files/cleaned_path";
import {
	isRafFile,
	isRawFile,
	copyModeLeakCheckDemandOf,
	requiresVerifiedWrite,
} from "./domain/files/file_types";
import { refuseUnsafeRafWrite } from "./domain/files/file_processing_outcome";
import type { OutputTransactionFailure } from "./output_transaction";

export function setupExifHandlers({
	container,
}: {
	container: Container;
}): void {
	const readMetadata = validated(exifReadSchema, async (filePath) => {
		const result = await container.readMetadata.execute({ filePath });
		if (result.ok) {
			return result.value;
		}
		throw new Error(formatExifError(result.error));
	});

	const removeMetadata = validated<string, RemoveMetadataResult>(
		exifRemoveSchema,
		async (filePath) => {
			const settings = container.settings.get();
			if (isRafFile({ filename: filePath })) {
				return refuseUnsafeRafWrite({ filePath });
			}
			if (settings.removeXattrs && !settings.saveAsCopy) {
				const metadataResult = await container.readMetadata.execute({
					filePath,
				});
				if (
					metadataResult.ok &&
					Object.keys(metadataResult.value).length === 0
				) {
					return applyXattrPostcondition({
						container,
						actualOutputPath: filePath,
						wasForcedCopy: false,
						removeXattrs: true,
						wroteFile: false,
					});
				}
			}
			const isRaw = isRawFile({ filename: filePath });
			const wasForcedCopy = isRaw && !settings.saveAsCopy;
			const saveAsCopy = settings.saveAsCopy || wasForcedCopy;
			const outputMode: "copy" | "overwrite" = saveAsCopy
				? "copy"
				: "overwrite";
			const outputPath = saveAsCopy
				? generateCleanedPath({ filePath, exists: existsSync })
				: undefined;

			if (requiresVerifiedWrite({ filename: filePath, outputMode })) {
				const generatedPath =
					outputPath ?? generateMediaStagePath({ filePath });
				const leakCheckDemand = copyModeLeakCheckDemandOf({
					filename: filePath,
					outputMode,
				});
				const copyModeLeakCheck =
					leakCheckDemand !== undefined
						? {
								demand: leakCheckDemand,
								preserveOrientation: settings.preserveOrientation,
								preserveColorProfile: settings.preserveColorProfile,
								preserveResolution: settings.preserveResolution,
							}
						: undefined;
				const transactionResult = await container.outputTransaction.execute({
					filePath,
					generatedPath,
					commitPath: outputPath === undefined ? filePath : undefined,
					preserveOrientation: settings.preserveOrientation,
					preserveColorProfile: settings.preserveColorProfile,
					preserveResolution: settings.preserveResolution,
					preserveTimestamps: settings.preserveTimestamps,
					...(copyModeLeakCheck === undefined ? {} : { copyModeLeakCheck }),
				});
				if (transactionResult.ok) {
					return applyXattrPostcondition({
						container,
						actualOutputPath: transactionResult.value.outputPath,
						wasForcedCopy,
						removeXattrs: settings.removeXattrs,
					});
				}
				return transactionFailureResult(transactionResult.error);
			}

			const result = await container.stripMetadata.execute({
				filePath,
				outputMode,
				preserveOrientation: settings.preserveOrientation,
				preserveColorProfile: settings.preserveColorProfile,
				preserveResolution: settings.preserveResolution,
				preserveTimestamps: settings.preserveTimestamps,
				saveAsCopy,
				outputPath,
			});
			if (result.ok) {
				return applyXattrPostcondition({
					container,
					actualOutputPath: outputPath ?? filePath,
					wasForcedCopy,
					removeXattrs: settings.removeXattrs,
				});
			}
			return { success: false, error: formatExifError(result.error) };
		},
	);

	ipc.registerService(ExifServiceDescriptor, {
		async ReadMetadata({ path }) {
			return { tags: await readMetadata(path) };
		},
		async RemoveMetadata({ path }) {
			return toRemoveMetadataResultMessage(await removeMetadata(path));
		},
	});
}

// Flattens the RemoveMetadataResult union into its protobuf message; the
// renderer api (src/renderer/api/window_api.ts) rebuilds the union.
function toRemoveMetadataResultMessage(
	result: RemoveMetadataResult,
): RemoveMetadataResultMessage {
	const message: RemoveMetadataResultMessage = {
		success: result.success,
		outputPath: "",
		wasForcedCopy: false,
		wroteFile: false,
		outputSize: 0,
		detail: "",
		refusalReason: "",
		originalPath: "",
	};
	if (result.success) {
		return {
			...message,
			outputPath: result.outputPath,
			wasForcedCopy: result.wasForcedCopy,
			wroteFile: result.wroteFile,
			outputSize: result.outputSize,
		};
	}
	if (!("failureKind" in result)) {
		return { ...message, error: result.error };
	}
	if (result.failureKind === "refused") {
		return {
			...message,
			failureKind: result.failureKind,
			detail: result.detail,
			refusalReason: result.refusalReason,
			originalPath: result.originalPath,
		};
	}
	return {
		...message,
		failureKind: result.failureKind,
		detail: result.detail,
		...(result.residualPath === undefined
			? {}
			: { residualPath: result.residualPath }),
	};
}

async function applyXattrPostcondition({
	container,
	actualOutputPath,
	wasForcedCopy,
	removeXattrs,
	wroteFile = true,
}: {
	container: Container;
	actualOutputPath: string;
	wasForcedCopy: boolean;
	removeXattrs: boolean;
	wroteFile?: boolean;
}) {
	if (!removeXattrs) {
		const outputSize = (await stat(actualOutputPath)).size;
		return {
			success: true as const,
			outputPath: actualOutputPath,
			wasForcedCopy,
			wroteFile,
			outputSize,
		};
	}

	try {
		await container.removeXattrCommand.execute({ filePath: actualOutputPath });
	} catch (error) {
		return xattrFailureResult({ actualOutputPath, error });
	}

	const outputSize = (await stat(actualOutputPath)).size;
	return {
		success: true as const,
		outputPath: actualOutputPath,
		wasForcedCopy,
		wroteFile,
		outputSize,
	};
}

function xattrFailureResult({
	actualOutputPath,
	error,
}: {
	actualOutputPath: string;
	error: unknown;
}) {
	const reason = error instanceof Error ? error.message : String(error);
	return {
		success: false as const,
		failureKind: "xattr" as const,
		detail: `Embedded metadata was removed, but macOS extended attributes could not be cleared: ${reason}`,
		residualPath: actualOutputPath,
	};
}

function generateMediaStagePath({ filePath }: { filePath: string }): string {
	const parsedPath = parse(filePath);
	return join(
		dirname(filePath),
		`.${parsedPath.name}.exifcleaner-stage-${randomUUID()}${parsedPath.ext}`,
	);
}

function transactionFailureResult(error: OutputTransactionFailure): {
	success: false;
	failureKind: "write" | "verification" | "cleanup" | "commit";
	detail: string;
	residualPath?: string;
} {
	switch (error.code) {
		case "write-failed":
			return {
				success: false,
				failureKind: "write",
				detail:
					error.timedOut === true
						? "Generated output write failed: exceeded the write time limit"
						: "Generated output write failed",
				...(error.residualPath === undefined
					? {}
					: { residualPath: error.residualPath }),
			};
		case "verification-failed":
			return {
				success: false,
				failureKind: "verification",
				detail: "Generated output verification failed",
			};
		case "cleanup-failed":
			return {
				success: false,
				failureKind: "cleanup",
				detail: "Generated output cleanup failed",
				residualPath: error.residualPath,
			};
		case "commit-failed":
			return {
				success: false,
				failureKind: "commit",
				detail: "Generated output commit failed",
			};
	}
}
