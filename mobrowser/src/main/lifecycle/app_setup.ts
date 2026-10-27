// MōBrowser is single-instance by default and brings the running instance to
// the front (Electron's requestSingleInstanceLock + "second-instance"), and
// quits when the last window closes on Windows and Linux ("window-all-closed").
// What is left to wire is the ExifTool shutdown.

interface SetupAppParams {
	onQuit: () => void;
}

export function setupApp({ onQuit }: SetupAppParams): void {
	// MōBrowser has no "will-quit" event; the main process exiting is the last
	// moment to ask ExifTool to stop. Should that not run, ExifTool still exits:
	// the POSIX watchdog config sees the parent gone, and on Windows its
	// `-@ -` argument loop ends when stdin closes.
	process.once("exit", onQuit);
}
