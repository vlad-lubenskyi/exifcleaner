import { MenuItem, workspace } from "@mobrowser/api";

interface OpenUrlMenuItemParams {
	id: string;
	label: string;
	url: string;
}

export function openUrlMenuItem({
	id,
	label,
	url,
}: OpenUrlMenuItemParams): MenuItem {
	return new MenuItem({
		id,
		label: label,
		action: function () {
			workspace.openUrl(url);
		},
	});
}
