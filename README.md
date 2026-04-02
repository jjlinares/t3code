# T3 Code

T3 Code is a minimal web GUI for coding agents (currently Codex and Claude, more coming soon).

## Installation

> [!WARNING]
> T3 Code currently supports Codex and Claude.
> Install and authenticate at least one provider before use:
>
> - Codex: install [Codex CLI](https://github.com/openai/codex) and run `codex login`
> - Claude: install Claude Code and run `claude auth login`

### Run without installing

```bash
npx t3
```

### Desktop app

Install the latest version of the desktop app from [GitHub Releases](https://github.com/pingdotgg/t3code/releases), or from your favorite package registry:

#### Windows (`winget`)

```bash
winget install T3Tools.T3Code
```

#### macOS (Homebrew)

```bash
brew install --cask t3-code
```

#### Arch Linux (AUR)

```bash
yay -S t3code-bin
```

#### Debian/Ubuntu

Download the `.deb` package from [GitHub Releases](https://github.com/pingdotgg/t3code/releases).

## Fork Notes

If you're maintaining a custom fork and still want upstream updates:

- Keep `origin` pointed at your fork.
- Keep `upstream` pointed at `pingdotgg/t3code`.
- Treat `upstream-main` as a clean mirror of upstream `main`.
- Keep your custom work on `main` or feature branches based on `main`.

Recommended sync flow:

```bash
git fetch upstream
git switch upstream-main
git merge --ff-only upstream/main
git push origin upstream-main

git switch main
git merge upstream-main
git push origin main
```

Guidelines:

- Do not hand-edit `upstream-main`.
- Prefer merging upstream into your public `main` instead of rebasing published history.
- Keep fork-specific changes isolated where possible so future upstream merges stay cheap.

## Some notes

We are very very early in this project. Expect bugs.

We are not accepting contributions yet.

## If you REALLY want to contribute still.... read this first

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or PR.

Need support? Join the [Discord](https://discord.gg/jn4EGJjrvv).
