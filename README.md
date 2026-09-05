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

## Getting started

```bash
pnpm install
pnpm --filter @workspace/api-server run dev   # API server on port 5000
```

Required env: `DATABASE_URL` — a Postgres connection string.

## Common commands

```bash
pnpm run typecheck                              # typecheck all packages
pnpm run build                                  # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks + Zod schemas
pnpm --filter @workspace/db run push            # push DB schema changes (dev only)
```

## Stack

pnpm workspaces · Node.js 24 · TypeScript 5.9 · React + Vite · Express 5 · PostgreSQL + Drizzle ORM · Zod · Orval · esbuild
