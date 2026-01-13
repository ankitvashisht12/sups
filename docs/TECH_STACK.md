# Tech Stack - SUPS

This document defines the technology stack for the SUPS Slack integration.

## Overview

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22 |
| Framework | Fastify |
| Slack SDK | @slack/bolt (custom receiver) |
| Database | Supabase (PostgreSQL) |
| ORM | Drizzle |
| Hosting | Render |
| Scheduling | cron-job.org |
| Local Dev | ngrok |

## Runtime & Framework

### Node.js 22

- Latest LTS version
- Required for @slack/bolt compatibility

### Fastify

- High-performance web framework
- Faster than Express with lower overhead
- Used with Bolt's custom receiver pattern

```javascript
// Example: Bolt with Fastify custom receiver
const { App } = require('@slack/bolt');
const Fastify = require('fastify');
```

## Slack Integration

### @slack/bolt

Official Slack framework that handles:
- Event verification
- OAuth flow
- Interactive components
- Slash commands

Bolt runs on a custom Fastify receiver instead of its default Express setup.

## Database

### Supabase (PostgreSQL)

- Managed PostgreSQL database
- Connection via standard PostgreSQL connection string
- No infrastructure management required

### Drizzle ORM

- Lightweight, type-safe ORM
- SQL-like syntax
- Smaller bundle size than alternatives
- Faster cold starts

```typescript
// Example: Drizzle schema
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const standups = pgTable('standups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

## Hosting

### Render

- Web service hosting
- Auto-deploys from GitHub
- HTTPS included

### Health Endpoint

The app exposes a `/health` endpoint for monitoring and keep-alive purposes:

```javascript
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
```

### Keep-Alive Strategy

Use [cron-job.org](https://cron-job.org) to ping the `/health` endpoint every 14 minutes. This:
- Prevents the server from sleeping due to inactivity
- Ensures Slack requests are handled without cold start delays

**Cron Configuration:**
- URL: `https://your-app.onrender.com/health`
- Schedule: Every 14 minutes
- Method: GET

## Scheduling

### cron-job.org

External cron service for:
1. **Keep-alive pings** - Every 14 minutes to `/health`
2. **Reminder triggers** - Hourly to `/api/check-reminders`

This approach is more reliable than in-process schedulers for hosted environments.

## Development Tools

### ngrok

- Tunnels localhost to public URL
- Required for Slack webhook development
- Update Slack app URLs with ngrok URL during development

```bash
# Start tunnel
ngrok http 3000
```

## Dependencies

### Production

```json
{
  "dependencies": {
    "@slack/bolt": "^3.x",
    "fastify": "^4.x",
    "drizzle-orm": "^0.30.x",
    "postgres": "^3.x"
  }
}
```

### Development

```json
{
  "devDependencies": {
    "drizzle-kit": "^0.21.x",
    "typescript": "^5.x",
    "@types/node": "^22.x"
  }
}
```

## Environment Variables

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Database
DATABASE_URL=postgresql://...

# App
PORT=3000
NODE_ENV=production
```
