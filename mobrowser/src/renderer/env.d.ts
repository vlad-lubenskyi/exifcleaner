import type { WindowApi } from "./api/api_types";

declare global {
	interface Window {
		api: WindowApi;
	}
}

// Augment React CSSProperties to allow CSS custom properties (--*)
declare module "react" {
	interface CSSProperties {
		[key: `--${string}`]: string | number | undefined;
	}
}
