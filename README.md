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
corepack enable pnpm
pnpm install
pnpm run dev        # http://localhost:5173
```

That is the whole setup. The community feed, walks, events, adoption, giving
and the lost-pet search map all run in the browser — no database, no API
server, no account needed.

`pnpm run dev` is shorthand for the line below. `PORT` and `BASE_PATH` are not
optional: `vite.config.ts` throws on startup if either is missing.

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/pet-community run dev
```

### Accounts

Sign-in uses [Clerk](https://clerk.com), and is off unless a publishable key is
present. Without one the app runs signed-out and keeps your profile in the
browser. To turn it on, copy `artifacts/pet-community/.env.example` to
`.env.local` and set `VITE_CLERK_PUBLISHABLE_KEY`.

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
