import {
  claimCommand,
  dialogOpen,
  useDialogOpen,
  useMenuCommands,
  useMenuState,
  type CommandSource,
} from "@/hooks/use-menu-commands"
import type { Command } from "@/gen/menu"

/**
 * The main window's commands: run from the application menu (streamed from the main process) and
 * from their keyboard shortcuts. Renders nothing; mounted by the main screen, which owns the state
 * the commands change. The template has none yet: add a case to `execute` for each of the app's
 * commands, handle its shortcut on the page too, and add a MenuState field for each guard it needs
 * (.agents/skills/desktop-shell/rules/menu.md, "Adding a menu item").
 */
export function AppCommands() {
  const modal = useDialogOpen()

  const execute = (command: Command, source: CommandSource) => {
    // The same command delivered twice for one keystroke (menu and page) runs once.
    if (!claimCommand(command, source)) return
    // Nothing runs behind a dialog: it would act on what the dialog is about.
    if (dialogOpen()) return
    switch (command) {
      // One case per Command value (`case Command.COMMAND_…:`) runs it.
      default:
        break
    }
  }
  useMenuCommands((command) => execute(command, "menu"))

  useMenuState({
    // The template has no data to load; an app with a store reports its loading state here.
    ready: true,
    modal,
  })

  return null
}
