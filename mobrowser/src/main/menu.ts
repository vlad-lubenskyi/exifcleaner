import { app, BrowserWindow, Menu, MenuItem, MenuOptions, MenuWithRole } from '@mobrowser/api';
import type { Command, MenuState } from './gen/menu';
import { openSettings } from './settings';
import { UPDATES_ENABLED } from './updates';

/**
 * The application menu.
 *
 * The app's own menu: File, Edit, View and Window (on macOS it replaces MōBrowser's default,
 * browser-flavored menu). Appearance lives in Settings → General.
 *
 * Commands the renderer performs (the template has none yet) start disabled, choosing one calls
 * `dispatch`, which streams its id to the renderer over MenuService (src/main/index.ts), and
 * `update()` enables and labels them from the state the renderer reports. Add them following
 * "Adding a menu item" in the rule below.
 *
 * Platform split (see docs/guides/guides/app-menu.md): on macOS the menu belongs to the
 * application (`app.setMenu`); on Windows and Linux each window owns its own menu bar
 * (`win.setMenu`). About and Settings… live in the app menu on macOS; on Windows and Linux,
 * Settings… is in File and About in Help. About opens Settings on its About page (the renderer
 * draws it with the app icon, which `app.showMessageDialog` can't).
 *
 * See `.agents/skills/desktop-shell/rules/menu.md` for the rules this follows.
 */

const isMac = process.platform === 'darwin';

/** Sends a menu command to the renderer (MenuService.OnCommand). */
export type MenuDispatch = (command: Command) => void;

/** The menu's renderer-driven items, updated from the state the renderer reports. */
export interface AppMenu {
  update(state: MenuState): void;
}

// The underscores mark `dispatch` and `state` unused: the app's first renderer command uses both.
export function installAppMenu(win: BrowserWindow, _dispatch: MenuDispatch): AppMenu {
  // About and Settings work in every renderer state (even before the page loads): never disabled.
  const about = new MenuItem({ id: 'about', label: `About ${app.name}`, action: () => openSettings('about') });
  const settings = new MenuItem({
    id: 'settings',
    label: 'Settings…',
    shortcut: 'CommandOrControl+,',
    action: () => openSettings('general'),
  });

  const fileMenu = new MenuWithRole({
    role: 'fileMenu',
    items: [
      // Windows and Linux have no app menu, so Settings… sits in File there.
      ...(isMac ? [] : [settings, 'separator' as const]),
      'closeWindow',
    ],
  });
  // Keep the edit roles wherever there are text inputs: they wire Undo/Cut/Copy/Paste/Select All.
  const editMenu = new MenuWithRole({
    role: 'editMenu',
    items: ['undo', 'redo', 'separator', 'cut', 'copy', 'paste', 'pasteAndMatchStyle', 'delete', 'selectAll'],
  });
  const viewMenu = new Menu({ label: 'View', items: appViewItems() });

  if (isMac) {
    app.setMenu(new Menu({ items: [macAppMenu(about, settings), fileMenu, editMenu, viewMenu, windowMenu()] }));
  } else {
    win.setMenu(new Menu({ items: [fileMenu, editMenu, viewMenu, helpMenu(about)] }));
  }

  return {
    update(_state: MenuState) {
      // Enable and label the renderer commands here. Nothing runs behind a dialog, and nothing
      // before the main screen is ready: combine each command's guard with `ready && !modal`.
    },
  };
}

/** The macOS application menu: About, Check for Updates, Settings, hide/show, quit. */
function macAppMenu(about: MenuItem, settings: MenuItem): MenuWithRole {
  return new MenuWithRole({
    role: 'macAppMenu',
    items: [
      about,
      // The built-in, user-initiated update flow; MōBrowser omits it without an update server.
      ...(UPDATES_ENABLED ? ['checkForUpdates' as const] : []),
      'separator',
      settings,
      'separator',
      'macHideApp',
      'macHideOthers',
      'macShowAll',
      'separator',
      'quit',
    ],
  });
}

/**
 * Zoom and full screen ship to users; reloading and DevTools are gated to development so end
 * users can't reload the app out from under itself.
 */
function appViewItems(): MenuOptions['items'] {
  const items: MenuOptions['items'] = ['zoomReset', 'zoomIn', 'zoomOut', 'separator', 'fullScreen'];
  if (!app.packaged) {
    items.push('separator', 'reload', 'reloadBypassCache', 'devTools');
  }
  return items;
}

/** Windows and Linux have no app menu, so About (and Check for Updates) live in Help. */
function helpMenu(about: MenuItem): Menu {
  return new Menu({ label: 'Help', items: [...(UPDATES_ENABLED ? ['checkForUpdates' as const, 'separator' as const] : []), about] });
}

function windowMenu(): MenuWithRole {
  return new MenuWithRole({ role: 'windowMenu', items: ['minimizeWindow', 'maximizeWindow'] });
}
