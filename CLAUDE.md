# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev                    # Start Cloudflare Workers dev server
bun run build:css              # Build Tailwind CSS
bun run lint                   # Run oxlint
bun run format                 # Run Biome formatter with --write
bun run typecheck              # TypeScript type checking (tsc --noEmit)
bun run db:generate            # Generate migrations for all databases
bun run db:generate:todo       # Generate todo migrations only
bun run db:generate:chat       # Generate chat migrations only
bun run db:generate:grid       # Generate grid migrations only
bun run deploy                 # Deploy to Cloudflare Workers
```

**Package manager is Bun** - do not use npm or yarn.

## Architecture

Real-time collaborative web app using Datastar (hypermedia framework) and Cloudflare Workers. The key architectural decision: **zero client-side JavaScript** - all interactivity is via HTML data attributes that Datastar interprets.

### Core Pattern: Durable Objects + SSE

Each feature (Todo, Chat, Grid) follows this pattern:
1. Page route renders initial HTML with `data-on-load` attribute
2. Client loads Datastar and initiates SSE connection to Durable Object
3. Durable Object streams initial state + broadcasts updates to all clients
4. API actions invoke Durable Object methods which update database and broadcast to clients

### Three Separate SQLite Databases (Cloudflare D1)

| Database | Table | Durable Object | Purpose |
|----------|-------|----------------|---------|
| Todo | `todos` | TodoResource | Collaborative todo list |
| Chat | `messages` | ChatResource | Real-time chat room |
| Grid | `chunks` | GridResource | Viewport-based chunk loading |

Schemas in `drizzle/schemas/`, configs in `drizzle/configs/`. Migrations are auto-generated - don't edit manually.

### Key Directories

- `src/routes/pages/` - HTML page routes (render React to HTML)
- `src/routes/actions/` - API action handlers (POST/DELETE)
- `src/routes/resources/` - Durable Object implementations with SSE broadcasting
- `src/components/ui/` - Shadcn components
- `src/lib/datastar.ts` - Datastar action helpers & resource names

### Datastar Attributes

```html
<form data-on-submit="@post('/api/todos', {contentType: 'form'})">
<button data-on-click="@delete('/api/todos/:id')">
<div data-show="$_filter === 'active'">
<div data-on-load="@get('/rt/todos/v1-todo-list/stream')">
```

## Code Style

- Formatting: 2 spaces, 100 char line width, single quotes (JS), double quotes (JSX)
- Imports: React first, external packages, then `@/` internal imports
- Strict TypeScript with explicit `React.FC` types
- Named exports for components with interface for props
- Use Drizzle ORM for all database operations
- All styling via Tailwind CSS utility classes

## Stack

- **Runtime**: Bun + Cloudflare Workers (nodejs_compat)
- **Framework**: Hono for routing
- **Frontend**: React 19 (SSR only, no hydration) + Datastar + Tailwind CSS
- **Database**: Drizzle ORM + SQLite (D1)
- **UI**: Shadcn (Radix UI) components
