import { app, BrowserWindow, ipc } from '@mobrowser/api';
import { OpenSettingsRequest } from './gen/app';
import { AppServiceDescriptor, MenuServiceDescriptor } from './gen/ipc_service';
import type { MenuCommand } from './gen/menu';
import { installAppMenu } from './menu';
import { guardNavigation } from './navigation';
import {
  checkForUpdatesAutomatically,
  closeSettings,
  openSettings,
  registerSettingsService,
  showWindowAtStartup,
  type SettingsSection,
} from './settings';
import { checkForUpdates } from './updates';
import { TRAFFIC_LIGHT_POSITION } from './window-chrome';
import * as process from "node:process";

// The native shell. Archetype: standard app — one resizable main window with a Dock icon and an
// application menu, plus the Settings window (src/main/settings.ts). See
// `.agents/skills/desktop-shell/SKILL.md`.
const win = new BrowserWindow()
win.browser.loadUrl(app.url)

// Hide the titlebar BEFORE sizing: hiding it afterwards removes its ~32px from the height
// (a 640px window came out 608px tall on macOS). Windows and Linux keep the native titlebar and
// its title; on macOS the title would be drawn over the content.
win.setWindowTitleVisible(process.platform !== 'darwin')
win.setWindowTitlebarVisible(process.platform !== 'darwin')

// Size: a small starter window (like Xcode's macOS app template) for the "Hello, world!" screen.
// Change both when the app gets real content: the minimum is the smallest size the renderer
// still lays out at.
win.setSize({ width: 540, height: 360 })
win.setMinimumSize({ width: 360, height: 240 })
win.setResizable(true)

if (process.platform === 'darwin') {
  // On the toolbar's baseline; see src/main/window-chrome.ts.
  win.setWindowButtonPosition(TRAFFIC_LIGHT_POSITION)
}

// Links open in the user's browser; the window never navigates away from the app.
guardNavigation(win)

// Menu commands the renderer performs travel over MenuService. OnCommand is a runtime-owned stream:
// registerService with no implementation returns its publisher, and every subscriber (the main
// window's AppCommands) receives what it publishes.
const menuService = ipc.registerService(MenuServiceDescriptor)
function publishCommand(command: MenuCommand) {
  menuService.OnCommand(command)
}
const appMenu = installAppMenu(win, (command) => publishCommand({ command }))

/** Brings the main window back (Dock click, a command dispatched from the Settings window). */
function showMainWindow() {
  if (win.isClosed) return
  if (win.isMinimized) win.restore()
  win.show()
  win.focus()
}

win.centerWindow()
// Settings → General → "Show window at startup" (macOS): when off, the app starts in the Dock
// and the window opens on the first Dock click.
if (showWindowAtStartup()) {
  win.show()
}
app.on('activated', () => {
  if (!win.isClosed && !win.isVisible) showMainWindow()
})
// This is a single-window app: closing the main window quits, Settings included.
win.on('closed', () => {
  closeSettings()
  app.quit()
})

if (checkForUpdatesAutomatically()) {
  // Not during launch: give the window time to load first.
  setTimeout(() => void checkForUpdates(win.isClosed ? undefined : win, false), 10_000)
}

// Handle the IPC calls from the renderer process.
registerSettingsService()

// MenuService's unary methods; OnCommand is owned by `menuService` above.
ipc.registerService(MenuServiceDescriptor, {
  async SetState(state) {
    appMenu.update(state)
    return {}
  },
  async Dispatch(command) {
    showMainWindow()
    publishCommand(command)
    return {}
  },
})

ipc.registerService(AppServiceDescriptor, {
  // Settings → About is drawn by the renderer (the native message dialog can't show the app
  // icon); it reads the app's identity from mobrowser.conf.json through here.
  async GetAppInfo() {
    return {
      name: app.name,
      version: app.version,
      description: app.description,
      copyright: app.copyright,
      architecture: architectureLabel(),
    };
  },
  async OpenSettings(request: OpenSettingsRequest) {
    openSettings(toSection(request.section));
    return {};
  },
})

function toSection(section: string): SettingsSection {
  return section === 'about' ? section : 'general';
}

/** "Version 1.0.0 (Apple Silicon)" on the About page. */
function architectureLabel(): string {
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'Apple Silicon' : 'Intel';
  if (process.arch === 'arm64') return 'ARM64';
  return process.arch === 'x64' ? '64-bit' : '';
}
