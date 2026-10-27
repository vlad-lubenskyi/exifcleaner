// Must run first: installs window.api, which replaces the Electron preload.
import "./api/window_api";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/drop_zone.css";
import "./styles/empty_state.css";
import "./styles/error_boundary.css";
import "./styles/file_list.css";
import "./styles/file_table.css";
import "./styles/folder_row.css";
import "./styles/status_bar.css";
import "./styles/status_icon.css";
import "./styles/toast.css";
import "./styles/type_pill.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
	throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
