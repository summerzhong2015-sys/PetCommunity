# PetCommunity

A neighborhood app for pet owners — a community feed, a map, messaging, lost & found, and local shelters.

## Repo layout

This is a pnpm workspace monorepo.

| Path | What it is |
| --- | --- |
| `artifacts/pet-community` | The main web app (React + Vite) |
| `artifacts/mockup-sandbox` | Sandbox for previewing UI mockups |
| `artifacts/api-server` | Express 5 API server |
| `lib/api-spec` | OpenAPI spec + Orval codegen config |
| `lib/api-client-react` | Generated React Query API hooks |
| `lib/api-zod` | Generated Zod schemas |
| `lib/db` | PostgreSQL schema (Drizzle ORM) |
| `scripts` | Workspace scripts |

## Run it locally

```bash
corepack enable        # uses the pnpm version pinned in package.json
pnpm install
pnpm run dev           # http://localhost:5173
```

That is the whole setup. The community feed, walks, events, adoption, giving
and the lost-pet search map all run in the browser — no database, no API
server, no account needed.

Use `corepack enable` rather than installing pnpm globally. The repo pins
pnpm 10 in `packageManager`, and a newer pnpm would rewrite `pnpm-lock.yaml`
to a lockfile version Vercel does not recognise, which silently drops its
build back to pnpm 6.

`PORT` and `BASE_PATH` are read from the environment when present (Replit sets
them) and otherwise default to 5173 and `/`.

### Tests

```bash
pnpm --filter @workspace/pet-community run test
```

No test runner to install — both suites run on plain Node. They cover the
lost-pet search model's behaviour and the profile migration, which are the two
places where a silent wrong answer would not look like a bug.

### Accounts

Sign-in uses [Clerk](https://clerk.com), and is off unless a publishable key is
present. Without one the app runs signed-out and keeps your profile in the
browser. To turn it on, copy `artifacts/pet-community/.env.example` to
`.env.local` and set `VITE_CLERK_PUBLISHABLE_KEY`.

## Deploying

The web app is a static build — no server, no database — so any static host
works. Vercel is configured in `vercel.json`:

| Setting | Value |
| --- | --- |
| Build command | `pnpm --filter @workspace/pet-community run build` |
| Output directory | `artifacts/pet-community/dist/public` |
| Install command | leave unset |

Leave the install command blank. Overriding it makes Vercel use the *oldest*
pnpm in the build image; left alone it reads `lockfileVersion: 9.0` and picks
pnpm 10, which is what the lockfile was built with.

The `rewrites` rule sends every unmatched path to `index.html`, so client-side
routes like `/adopt` and `/lost-pets/l1` survive a refresh or a shared link.

To enable accounts on the deployed site, add `VITE_CLERK_PUBLISHABLE_KEY` as an
environment variable in the project settings. Without it the site runs
signed-out, which is a perfectly good way to ship it.

### The API server

Only needed for work on the backend, and it wants a Postgres instance:

```bash
DATABASE_URL=postgres://... pnpm --filter @workspace/api-server run dev   # port 5000
```

## Common commands

```bash
pnpm run typecheck                              # typecheck all packages
pnpm run build                                  # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks + Zod schemas
pnpm --filter @workspace/db run push            # push DB schema changes (dev only)
```

## Stack

pnpm workspaces · Node.js 24 · TypeScript 5.9 · React + Vite · Express 5 · PostgreSQL + Drizzle ORM · Zod · Orval · esbuild
