import { ipc } from "@mobrowser/api";
import {
	FilesServiceDescriptor,
	I18nServiceDescriptor,
	SettingsServiceDescriptor,
	ThemeServiceDescriptor,
} from "../gen/ipc_service";

// Main -> renderer events. Each server-streaming rpc is a runtime-owned
// pub/sub stream: registering the descriptor without an implementation
// returns one publish function per stream, and every subscribed renderer
// receives what is published. These replace webContents.send(channel, ...).
export const filesEvents = ipc.registerService(FilesServiceDescriptor);
export const i18nEvents = ipc.registerService(I18nServiceDescriptor);
export const settingsEvents = ipc.registerService(SettingsServiceDescriptor);
export const themeEvents = ipc.registerService(ThemeServiceDescriptor);
