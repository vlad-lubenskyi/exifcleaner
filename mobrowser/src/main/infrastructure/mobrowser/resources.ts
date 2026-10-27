import path from "path";
import { app } from "@mobrowser/api";

const ICON_FILENAME = "icon.png";
const CHECKMARK_FILENAME = "check.png";

// MōBrowser copies the project's resources/ directory (and the per-platform
// `extras` in mobrowser.conf.json) into the bundle in dev and packaged builds
// alike, so one path serves both.
export function resourcesPath(): string {
	return app.getPath("appResources");
}

export function iconPath(): string {
	return path.join(resourcesPath(), ICON_FILENAME);
}

export function checkmarkPath(): string {
	return path.join(resourcesPath(), CHECKMARK_FILENAME);
}
