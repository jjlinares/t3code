import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createHashHistory, createBrowserHistory } from "@tanstack/react-router";

import "@xterm/xterm/css/xterm.css";
import "./index.css";

import { bootstrapServerAuth } from "./authBootstrap";
import { isElectron } from "./env";
import { getRouter } from "./router";
import { APP_DISPLAY_NAME } from "./branding";

// Electron loads the app from a file-backed shell, so hash history avoids path resolution issues.
const history = isElectron ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);

function renderApp() {
  document.title = APP_DISPLAY_NAME;
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

function renderBootstrapError(error: unknown) {
  document.title = `${APP_DISPLAY_NAME} Error`;
  const message = error instanceof Error ? error.message : String(error);
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">Failed to connect</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>,
  );
}

void bootstrapServerAuth().then(renderApp).catch(renderBootstrapError);
