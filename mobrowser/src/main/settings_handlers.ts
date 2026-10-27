import { ipc } from "@mobrowser/api";
import type { Container } from "./container";
import type { Settings } from "./domain";
import { validated } from "./ipc/ipc_validation";
import { settingsGetSchema, settingsSetSchema } from "./ipc/ipc_schemas";
import { SettingsServiceDescriptor } from "./gen/ipc_service";
import { settingsEvents } from "./ipc/events";
import { fromSettingsPatch, toSettingsMessage } from "./ipc/settings_message";
import { handleLanguageChange } from "./i18n";

export function setupSettingsHandlers({
	container,
}: {
	container: Container;
}): void {
	const get = validated(settingsGetSchema, async () => {
		return container.settings.get();
	});

	const set = validated(settingsSetSchema, async (input) => {
		// settingsSetSchema has already validated this as a partial update. Expanding
		// it through full-schema defaults here would silently reset every omitted
		// preference whenever the user changed a single toggle.
		const partial = Object.fromEntries(
			Object.entries(input).filter(([, value]) => value !== undefined),
		) as Partial<Settings>;
		await updateSettingsAndNotify({ container, partial });

		return { success: true, error: null };
	});

	ipc.registerService(SettingsServiceDescriptor, {
		async Get() {
			return toSettingsMessage(await get(undefined));
		},
		async Set(patch) {
			const { success } = await set(fromSettingsPatch(patch));
			return { success };
		},
	});
}

export async function updateSettingsAndNotify({
	container,
	partial,
}: {
	container: Container;
	partial: Partial<Settings>;
}): Promise<Settings> {
	const previousLanguage = container.settings.get().language;
	await container.settings.update({ partial });
	const newSettings = container.settings.get();

	settingsEvents.OnChanged(toSettingsMessage(newSettings));
	handleLanguageChange(previousLanguage, newSettings.language);

	return newSettings;
}
