# Getting Started

This is the authoritative developer setup guide for the monorepo. It consolidates the
previously scattered root-level docs (`BUILD_GUIDE.md`, `ENVIRONMENT.md`,
`TROUBLESHOOTING.md`, and `QUICK_REFERENCE.md`). If any of those files disagree with this
guide, this guide wins.

## Prerequisites

- **Node.js** >= 18 (LTS recommended)
- **pnpm** >= 8 (this repo is a pnpm workspace; do not use npm/yarn)
- **Git**

Install pnpm if you don't have it:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 1. Clone and install

```bash
git clone <repo-url>
cd <repo>
pnpm install
```

`pnpm install` installs dependencies for every package listed in `pnpm-workspace.yaml`.

## 2. Environment variables

Copy the example env file and fill in local values:

```bash
cp .env.example .env
```

Never commit `.env` or real secrets. Required variables are documented inline in
`.env.example`.

## 3. Run the dev environment

Tasks are orchestrated by Turborepo (see `turbo.json`). Common commands:

```bash
pnpm dev        # run all dev tasks (turbo run dev)
pnpm build      # build all packages (turbo run build)
pnpm test       # run the test suite (turbo run test)
pnpm lint       # lint all packages (turbo run lint)
```

To scope a command to a single package, use pnpm's filter:

```bash
pnpm --filter <package-name> dev
```

## 4. Verify your setup

A fresh clone is working when:

1. `pnpm install` completes without errors.
2. `pnpm build` succeeds.
3. `pnpm dev` starts the dev servers without crashing.
4. `pnpm test` runs (passing tests depend on the package).

## Troubleshooting

- **`pnpm: command not found`** — enable Corepack (see Prerequisites) or install pnpm globally.
- **Install fails / stale lockfile** — delete `node_modules` and re-run `pnpm install`.
- **Port already in use** — stop the conflicting process or change the port in the package's config.
- **Turbo cache issues** — clear the cache with `pnpm turbo run build --force`.
- **Node version mismatch** — switch to Node 18+ (e.g. via `nvm use`).

## Quick reference

| Task | Command |
| --- | --- |
| Install deps | `pnpm install` |
| Dev servers | `pnpm dev` |
| Build | `pnpm build` |
| Test | `pnpm test` |
| Lint | `pnpm lint` |
| Single package | `pnpm --filter <pkg> <script>` |

## Related docs

- `pnpm-workspace.yaml` — workspace package globs
- `turbo.json` — task pipeline definitions
