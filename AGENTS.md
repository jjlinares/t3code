# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Project Snapshot

T3 Code is a minimal web GUI for using coding agents like Codex and Claude.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Package Roles

- `apps/server`: Node.js WebSocket server. Wraps Codex app-server (JSON-RPC over stdio), serves the React web app, and manages provider sessions.
- `apps/web`: React/Vite UI. Owns session UX, conversation/event rendering, and client-side state. Connects to the server via WebSocket.
- `packages/contracts`: Shared effect/Schema schemas and TypeScript contracts for provider events, WebSocket protocol, and model/session types. Keep this package schema-only — no runtime logic.
- `packages/shared`: Shared runtime utilities consumed by both server and web. Uses explicit subpath exports (e.g. `@t3tools/shared/git`) — no barrel index.

## Codex App Server (Important)

T3 Code is currently Codex-first. The server starts `codex app-server` (JSON-RPC over stdio) per provider session, then streams structured events to the browser through WebSocket push messages.

How we use it in this codebase:

- Session startup/resume and turn lifecycle are brokered in `apps/server/src/codexAppServerManager.ts`.
- Provider dispatch and thread event logging are coordinated in `apps/server/src/providerManager.ts`.
- WebSocket server routes NativeApi methods in `apps/server/src/wsServer.ts`.
- Web app consumes orchestration domain events via WebSocket push on channel `orchestration.domainEvent` (provider runtime activity is projected into orchestration events server-side).

Docs:

- Codex App Server docs: https://developers.openai.com/codex/sdk/#app-server

## Reference Repos

- Open-source Codex repo: https://github.com/openai/codex
- Codex-Monitor (Tauri, feature-complete, strong reference implementation): https://github.com/Dimillian/CodexMonitor

Use these as implementation references when designing protocol handling, UX flows, and operational safeguards.

## Fork Maintenance

Maintain this repo as a fork with a clean upstream mirror.

- Keep `origin` pointed at the fork.
- Keep `upstream` pointed at `pingdotgg/t3code`.
- Treat `upstream-main` as a read-only mirror of upstream `main`.
- Keep fork-specific work on `main` or on feature branches branched from `main`.
- Never hand-edit `upstream-main`.
- Merge upstream into public branches. Do not rebase published fork history.
- Keep fork-specific changes isolated so upstream merges stay cheap.

Use this sync flow:

```bash
git fetch upstream
git switch upstream-main
git merge --ff-only upstream/main
git push origin upstream-main

git switch main
git merge upstream-main
git push origin main
```

## Current Production Runtime

Run the built Node server as the current production app.

- Build the app with `bun run build`.
- Run the built server with Node, not Bun. The built server entrypoint depends on `node:sqlite`.
- Keep the persistent runtime under the user `systemd` service `t3code.service`.
- After code changes, build and restart the user service.
- Primary historical logs live in the user `systemd` journal for `t3code.service`.
- App server log file: `~/.t3/userdata/logs/server.log`
- Provider logs dir: `~/.t3/userdata/logs/provider`
- Terminal logs dir: `~/.t3/userdata/logs/terminals`
- Crash/restart history may exist in the `systemd` journal even when it is not present in `server.log`.
