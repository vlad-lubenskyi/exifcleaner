import * as React from "react"

import { AppCommands } from "@/components/home/app-commands"
import { Kbd } from "@/components/ui/kbd"
import { ipc } from "@/gen/ipc"
import { hasModKey, MOD } from "@/lib/platform"

function openSettings() {
  ipc.app.OpenSettings({ section: "general" }).catch((error: unknown) => {
    console.warn("Couldn't open Settings:", error)
  })
}

/**
 * The main window (`#/`): an empty 48px toolbar on the traffic lights' baseline, and
 * "Hello, world!" in the middle, like Xcode's app template, with a hint for opening Settings.
 * Replace the content with the app; keep the toolbar's drag region, the Settings shortcut, and
 * AppCommands, where the app's menu commands run.
 */
export function HomeApp() {
  // Settings: the menu binds ⌘, too, but a key press sent to the page (an e2e test, `agent
  // press-key`) never reaches a native menu. Opening Settings twice only focuses it.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "," && hasModKey(event) && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        openSettings()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Flush to the top, under the macOS traffic lights; the empty bar drags the window. Put
          toolbar controls here, right of --titlebar-traffic-width. */}
      <header className="app-drag-region flex h-12 shrink-0 items-center gap-2 px-2 pl-[max(0.5rem,calc(var(--titlebar-traffic-width)+0.5rem))]" />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto p-6 text-center">
        <p className="text-sm">Hello, world!</p>
        {/* ⌘, on macOS, Ctrl+, on Windows and Linux: the shortcut the menu and the handler above bind. */}
        <p className="text-xs text-muted-foreground">
          Press <Kbd>{MOD},</Kbd> to open Settings
        </p>
      </main>
      <AppCommands />
    </div>
  )
}
