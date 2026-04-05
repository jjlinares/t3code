import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createHashHistory, createBrowserHistory } from "@tanstack/react-router";

import "@xterm/xterm/css/xterm.css";
import "./index.css";

import { createHandledAsyncCallback } from "./appStartup";
import { bootstrapServerAuth, getBootstrapServerAuth } from "./authBootstrap";
import { isElectron } from "./env";
import { getRouter } from "./router";
import { APP_DISPLAY_NAME } from "./branding";

// Electron loads the app from a file-backed shell, so hash history avoids path resolution issues.
const history = isElectron ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

function renderScreen(title: string, children: React.ReactNode) {
  document.title = title;
  root.render(<React.StrictMode>{children}</React.StrictMode>);
}

function renderApp() {
  renderScreen(APP_DISPLAY_NAME, <RouterProvider router={router} />);
}

function renderBootstrapPending() {
  renderScreen(
    `${APP_DISPLAY_NAME} Connecting`,
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">Connecting</h1>
        <p className="text-sm text-muted-foreground">Restoring your browser session.</p>
      </div>
    </div>,
  );
}

function renderBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  renderScreen(
    `${APP_DISPLAY_NAME} Error`,
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Failed to connect</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          onClick={runStartApp}
        >
          Retry
        </button>
      </div>
    </div>,
  );
}

async function startApp() {
  const bootstrap = getBootstrapServerAuth();
  if (bootstrap) {
    renderBootstrapPending();
  }
  await bootstrapServerAuth(bootstrap);
  renderApp();
}

const runStartApp = createHandledAsyncCallback(startApp, renderBootstrapError);

runStartApp();
