# Quick setup

1. Install [mise](https://mise.jdx.dev) if you don't have it yet (pins Node + other tool versions for this repo).
2. Make sure your container runtime is running — either Docker Desktop, or [Apple `container`](https://github.com/apple/container) on Apple Silicon.
3. Run:
```
mise install
mise run setup        # pnpm install + git hooks (lefthook)
mise run docker-up    # Docker
# or
mise run apple-up     # Apple container
```
   `mise tasks` lists every available command (linting, tests, per-service up/down/logs, etc.) for both backends.
4. On desktop go to https://YOUR_IP:8080 and accept the unsafe connection - necessary to enable the WS server, then open https://YOUR_IP:3000
5. On mobile go to https://YOUR_IP:8080 and accept the unsafe connection, then scan the QR code from desktop to start the game.
6. localhost:3001 is a library of separate modules displayed in an isolated environment. Something like Storybook, but I found it unnecessarily complex to use Storybook in this kind of project.
