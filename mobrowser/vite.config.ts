import path from "path"
import { mobrowserReactAnnotation } from "@mobrowser/api/internal/vite/react"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin, type UserConfig } from "vite"

export default defineConfig(({ command, mode }) => {
  if (mode === "main") {
    return defineMainConfig()
  }
  if (mode === "renderer") {
    return defineRendererConfig(command)
  }
  throw new Error(`Unsupported Vite config mode: ${mode}`)
})

function defineMainConfig(): UserConfig {
  return {
    root: path.resolve(import.meta.dirname, "./src/main"),
    build: {
      target: "esnext",
      outDir: path.resolve(import.meta.dirname, "./out/main"),
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        entry: path.resolve(import.meta.dirname, "./src/main/index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        // exifcleaner-node loads prebuilt publication.node add-ons relative to its
        // own files, so it must not be bundled. mobrowser.conf.json `nodeModules`
        // ships it verbatim next to the built main bundle. The MōBrowser CLI's
        // automatic externals miss it (its `exports` map hides package.json from
        // the CLI's native-binary probe), and the CLI only merges a user
        // `external` given as a function.
        external: (source) => source === "exifcleaner-node",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src/main"),
      },
    },
    server: {
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ['warn', 'error'],
      },
    },
  }
}

// ExifCleaner's Content Security Policy, carried over from electron.vite.config.ts.
// Dev mode adds what the Vite dev server needs (inline scripts, the HMR socket).
// The bundled renderer is served from mobrowser://app, which Chromium does not
// match with 'self' (a custom scheme), so the origin is listed explicitly.
const APP_ORIGIN = "mobrowser://app"

function cspPlugin(): Plugin {
  return {
    name: "html-csp",
    transformIndexHtml(_html, ctx) {
      const isDev = ctx.server !== undefined
      const self = isDev ? "'self'" : `'self' ${APP_ORIGIN}`
      const scriptSrc = isDev ? "'self' 'unsafe-inline'" : self
      const styleSrc = `${self} 'unsafe-inline'`
      const connectSrc = isDev ? "'self' ws://localhost:*" : self
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: `default-src 'none'; script-src ${scriptSrc}; style-src ${styleSrc}; img-src ${self} data:; font-src ${self}; connect-src ${connectSrc}; base-uri 'none'; frame-ancestors 'none'`,
          },
          injectTo: "head-prepend",
        },
      ]
    },
  }
}

function defineRendererConfig(command: "build" | "serve"): UserConfig {
  return {
    root: path.resolve(import.meta.dirname, "./src/renderer"),
    plugins: [react(mobrowserReactAnnotation(command)), cspPlugin()],
    build: {
      outDir: path.resolve(import.meta.dirname, "./out/renderer"),
      emptyOutDir: true,
      sourcemap: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src/renderer"),
      },
    },
    server: {
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ['warn', 'error'],
      },
    },
  }
}
