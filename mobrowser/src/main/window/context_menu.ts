import { ContextMenu, type BrowserWindow } from "@mobrowser/api";

// Copy and Select All are role items labelled by MōBrowser in the system
// language; Electron's custom items used the strings.json labels.
function buildMenu(canCopy: boolean): ContextMenu {
	return new ContextMenu({
		items: canCopy ? ["copy", "selectAll"] : ["selectAll"],
	});
}

export function setupContextMenu(win: BrowserWindow): void {
	win.browser.handle("showContextMenu", (params) => {
		const isTextSelected = params.selectedText.trim().length > 0;
		return buildMenu(isTextSelected);
	});
}
