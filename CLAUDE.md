# CLAUDE.md - SUPS Project Guide

## Project Overview

SUPS (Stand-Up Integration for Slack) is a Slack app that automates stand-up collection via DMs and posts them to a designated channel. Built for App Store distribution (multi-workspace support).

## Tech Stack

- **Runtime**: Node.js 22 (LTS)
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Slack SDK**: @slack/bolt (with built-in ExpressReceiver)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Testing**: Vitest

## Project Structure

```
sups/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Main Bolt app entry point
│   │   ├── config/
│   │   │   └── env.ts          # Zod-validated environment config
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle schema definitions
│   │   │   └── index.ts        # Database connection
│   │   ├── handlers/
│   │   │   ├── dm-handler.ts   # DM message handling
│   │   │   ├── mention-handler.ts  # @SUPS commands
│   │   │   ├── oauth-handler.ts    # OAuth installation
│   │   │   └── index.ts
│   │   └── services/
│   │       ├── workspace-service.ts
│   │       ├── standup-service.ts
│   │       └── reminder-service.ts
│   ├── tests/
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docs/                       # Architecture & planning docs
└── .env.example
```

## Database Schema

Four tables in PostgreSQL:

### workspaces
Stores each Slack workspace that installs the app.
- `id` (UUID, PK)
- `slack_workspace_id` (unique) - Slack's team_id
- `bot_token` - OAuth token for API calls
- `standup_channel_id` - The configured standup channel
- `reminder_time` - When to send reminders (default: 19:00)
- `deadline_time` - When to post standups (default: 20:00)
- `timezone` - Workspace timezone

### users
User preferences and status.
- `id` (UUID, PK)
- `slack_user_id`
- `workspace_id` (FK)
- `is_admin`, `is_on_leave`, `leave_until`

### standups
The actual standup submissions.
- `id` (UUID, PK)
- `workspace_id` (FK)
- `slack_user_id`
- `content` - The standup message
- `date` - Which day
- `is_late` - After deadline?
- `posted_to_channel` - Already posted?

### reminders
Track sent reminders to prevent duplicates.
- `id` (UUID, PK)
- `workspace_id` (FK)
- `scheduled_date`
- `status` - pending/sent/failed

## Key Commands

```bash
cd backend
pnpm install          # Install dependencies
pnpm run dev          # Start dev server with hot reload
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm run db:push      # Push schema to database
pnpm run db:studio    # Open Drizzle Studio
```

## Environment Variables

Required in `backend/.env`:
```
DATABASE_URL=postgresql://...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
PORT=3000
NODE_ENV=development
```

## Architecture Decisions

1. **No separate web framework** - Using Bolt's built-in ExpressReceiver
2. **One channel per workspace** - Simplest MVP, multi-channel support later
3. **OAuth multi-workspace** - App Store distribution ready
4. **TDD approach** - Tests written first for services

## Current Status (MVP)

### Implemented ✅
- OAuth installation flow
- DM standup submission → "Got it! ✅"
- Multiple messages aggregated per day
- `@SUPS status` command
- `@SUPS help` command
- Reminder check endpoint `/api/reminders/check`
- Daily standup posting to thread

### Not Yet Implemented ❌
- Setup wizard (channel selection, times)
- Config modal (`@SUPS config`)
- Skip/vacation commands (backend ready, no user table updates)
- AI summarize feature

## Slack App Configuration

Required settings in api.slack.com/apps:

### OAuth & Permissions
- Redirect URL: `https://<url>/slack/oauth_redirect`
- Scopes: `app_mentions:read`, `channels:read`, `chat:write`, `im:history`, `im:read`, `im:write`, `users:read`

### Event Subscriptions
- Request URL: `https://<url>/slack/events`
- Bot Events: `app_mention`, `message.im`, `app_uninstalled`

### App Home
- Messages Tab: **ON**
- Allow users to send messages: **ON** (required for DMs!)

## Testing

Tests use Vitest with mocked database. Run with:
```bash
pnpm test:run
```

38 tests covering:
- Workspace service (CRUD)
- Standup service (submit, aggregate, status)
- Reminder service (scheduling, tracking)
- DM handler (command parsing)

## Common Tasks

### Add a new Slack event handler
1. Add handler in `src/handlers/`
2. Register in `src/app.ts` with `app.event('event_name', handler)`
3. Add event to Slack app's Event Subscriptions

### Add a new slash command
1. Create handler in `src/handlers/`
2. Register with `app.command('/command', handler)`
3. Add command in Slack app's Slash Commands

### Add a new database table
1. Add schema in `src/db/schema.ts`
2. Export from `src/db/index.ts`
3. Run `pnpm run db:push`

## Code Style

- Use async/await, not callbacks
- Services contain business logic, handlers are thin
- Use Zod for validation
- JSDoc for public functions
- 2-space indentation, single quotes, semicolons
