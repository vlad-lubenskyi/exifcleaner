import { app, Menu, MenuItem, workspace } from "@mobrowser/api";
import os from "os";
import { isMac } from "../common";
import { showAboutWindow } from "./menu_app_about";
import { openUrlMenuItem } from "./menu_item_open_url";
import { i18n, locale } from "../i18n";

export const WEBSITE_URL = "https://exifcleaner.com";
export const GITHUB_USERNAME = "szTheory";
const GITHUB_PROJECTNAME = "exifcleaner";
const SOURCE_CODE_URL = `https://github.com/${GITHUB_USERNAME}/${GITHUB_PROJECTNAME}`;
const RELEASES_URL = `${SOURCE_CODE_URL}/releases`;

export function helpMenuTemplate(): Menu {
	return new Menu({
		label: i18n({ key: "menu.help.name" }),
		items: buildHelpSubmenu(),
	});
}

function buildHelpSubmenu(): Menu["items"] {
	let submenu: Menu["items"] = [
		openUrlMenuItem({
			id: "help-website",
			label: i18n({ key: "menu.help.website" }),
			url: WEBSITE_URL,
		}),
		openUrlMenuItem({
			id: "help-source-code",
			label: i18n({ key: "menu.help.source-code" }),
			url: SOURCE_CODE_URL,
		}),
		openUrlMenuItem({
			id: "help-new-releases",
			label: i18n({ key: "menu.help.new-releases" }),
			url: RELEASES_URL,
		}),
		new MenuItem({
			id: "help-report-issue",
			label: `${i18n({ key: "menu.help.report-issue" })}…`,
			action() {
				const url = newGithubIssueUrl(
					GITHUB_USERNAME,
					GITHUB_PROJECTNAME,
					newGithubIssueBody(),
				);
				workspace.openUrl(url);
			},
		}),
	];

	if (!isMac()) {
		submenu.push(
			"separator",
			new MenuItem({
				id: "help-about",
				label: `${i18n({ key: "menu.help.about" })}${app.name}`,
				action() {
					showAboutWindow(GITHUB_USERNAME, WEBSITE_URL);
				},
			}),
		);
	}

	return submenu;
}

function newGithubIssueUrl(user: string, repo: string, body: string): string {
	const url = new URL(`https://github.com/${user}/${repo}/issues/new`);
	url.searchParams.set("body", body);

	return url.toString();
}

function newGithubIssueBody(): string {
	return `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`;
}

function debugInfo(): string {
	return `
${app.name} ${app.version}
MōBrowser (Chromium ${process.versions["chrome"] ?? "unknown"}, Node ${process.versions.node})
${process.platform} ${os.release()}
Locale: ${locale()}
`.trim();
}
