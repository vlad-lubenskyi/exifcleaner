import type { ZodType } from "zod";

// MōBrowser only lets the app's own origin (and app.trustedOrigins) reach
// ipc services, and re-checks the frame origin in the main process, so the
// Electron-era sender allowlist is gone. Payloads are still validated here:
// protobuf guarantees the shape, the schemas enforce the meaning (non-empty
// paths, no line breaks, positive counts).
export function validated<TPayload, TResult>(
	schema: ZodType<TPayload>,
	handler: (payload: TPayload) => Promise<TResult>,
): (rawPayload: unknown) => Promise<TResult> {
	return async (rawPayload) => handler(schema.parse(rawPayload));
}
