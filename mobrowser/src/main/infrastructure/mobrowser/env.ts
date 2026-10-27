import { app } from "@mobrowser/api";

export function isProd(): boolean {
	return app.packaged;
}

export function isDev(): boolean {
	return !isProd();
}
