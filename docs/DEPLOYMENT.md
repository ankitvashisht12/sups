# Deployment Guide - SUPS

This guide covers deploying SUPS to production.

For tech stack details, see [TECH_STACK.md](./TECH_STACK.md).

## Prerequisites

- Slack app configured (see [SETUP.md](./SETUP.md))
- [Render](https://render.com) account
- [Supabase](https://supabase.com) account (database)
- [cron-job.org](https://cron-job.org) account (keep-alive & scheduling)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Render (Web Service)                                           │
│  └─ Node.js + Fastify + Bolt                                    │
│  └─ /health endpoint for keep-alive                             │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL)                                          │
│  └─ teams, standups, reminders, users tables                    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  cron-job.org                                                   │
│  └─ Ping /health every 14 min (keep server awake)               │
│  └─ Trigger /api/check-reminders hourly                         │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Set Up Supabase (Database)

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down the connection string from **Settings → Database**

### Run Migrations

Before deploying, push your schema to Supabase:

```bash
# In backend directory
npx drizzle-kit push
```

## Step 2: Deploy to Render

### Create Web Service

1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `sups` |
| Region | Choose closest to your users |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |

### Set Environment Variables

In Render dashboard, add these environment variables:

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# App
NODE_ENV=production
PORT=10000
```

### Deploy

Click **"Create Web Service"**. Render will build and deploy automatically.

Note your app URL: `https://sups-xxxx.onrender.com`

## Step 3: Update Slack App URLs

Go to [api.slack.com/apps](https://api.slack.com/apps) and update:

| Setting | URL |
|---------|-----|
| Event Subscriptions → Request URL | `https://sups-xxxx.onrender.com/slack/events` |
| OAuth → Redirect URL | `https://sups-xxxx.onrender.com/slack/oauth_redirect` |

## Step 4: Set Up Keep-Alive (cron-job.org)

Render's free tier sleeps after 15 minutes of inactivity. We use cron-job.org to keep it awake.

### Create Keep-Alive Job

1. Go to [cron-job.org](https://cron-job.org) and create an account
2. Click **"Create cronjob"**
3. Configure:

| Setting | Value |
|---------|-------|
| Title | `SUPS Keep Alive` |
| URL | `https://sups-xxxx.onrender.com/health` |
| Schedule | Every 14 minutes |
| Request Method | GET |

### Create Reminder Trigger Job

1. Create another cronjob:

| Setting | Value |
|---------|-------|
| Title | `SUPS Check Reminders` |
| URL | `https://sups-xxxx.onrender.com/api/check-reminders` |
| Schedule | Every hour at minute 0 |
| Request Method | POST |

This triggers your reminder logic hourly.

## Step 5: Verify Deployment

### Health Check

```bash
curl https://sups-xxxx.onrender.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test Slack Integration

1. In Slack, DM your app: "test"
2. @mention your app in a channel: `@SUPS status`

## Post-Deployment Checklist

- [ ] Health endpoint responds
- [ ] Slack events are received (check Render logs)
- [ ] DMs to app work
- [ ] @mentions work
- [ ] cron-job.org jobs are running (check job history)
- [ ] Database connection is stable

## Monitoring

### Render Logs

View logs in Render dashboard → Your Service → **"Logs"**

### cron-job.org History

Check job execution history to ensure keep-alive and reminders are running.

### Recommended Additions

| Tool | Purpose |
|------|---------|
| [UptimeRobot](https://uptimerobot.com) | Uptime monitoring (free) |
| [Sentry](https://sentry.io) | Error tracking (free tier) |

## Troubleshooting

### Slack Events Not Received

- Check Render logs for errors
- Verify Request URL in Slack app settings matches your Render URL
- Ensure signing secret is correct

### Server Sleeping (Cold Starts)

- Verify cron-job.org keep-alive job is running every 14 minutes
- Check job history for failures

### Database Connection Errors

- Verify `DATABASE_URL` in Render environment variables
- Check Supabase project is active
- Ensure connection pooling is enabled in Supabase

### Reminders Not Sending

- Check cron-job.org reminder job is running
- View Render logs around the scheduled time
- Verify bot has permissions in the Slack channel

## Scaling (Future)

When you outgrow the free tier:

| Upgrade | When |
|---------|------|
| Render paid tier | Need always-on server, no cold starts |
| Supabase Pro | Need more than 500MB database |
| Redis (Upstash) | Need caching or job queues |

## Security Checklist

- [ ] Environment variables set (not hardcoded)
- [ ] HTTPS enforced (Render does this automatically)
- [ ] Slack signing secret verified on all requests
- [ ] Database credentials not in code
- [ ] `.env` files in `.gitignore`

## Rollback

If something goes wrong:

1. In Render → Your Service → **"Deploys"**
2. Find the last working deploy
3. Click **"Redeploy"**

## Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Slack API Status**: [status.slack.com](https://status.slack.com)
