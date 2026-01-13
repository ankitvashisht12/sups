# Setup Guide - SUPS

This guide helps you set up SUPS for local development.

## Prerequisites

- **Node.js 22** (LTS)
- **npm** or **yarn**
- **Git**
- **Slack Workspace** with admin permissions
- **ngrok** (for local development)
- **Supabase account** (free tier works)

For complete tech stack details, see [TECH_STACK.md](./TECH_STACK.md).

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd sups

# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

## Step 2: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to **Settings → Database**
4. Copy the connection string (URI format)
5. Save it for the `.env` file

## Step 3: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app: `SUPS`
4. Select your workspace
5. Click **"Create App"**

## Step 4: Configure Slack App

### Basic Information

1. Go to **"Basic Information"** in the sidebar
2. Note down:
   - **Signing Secret** (under App Credentials)

### OAuth & Permissions

1. Navigate to **"OAuth & Permissions"**
2. Under **"Scopes" → "Bot Token Scopes"**, add:
   - `chat:write` - Send messages
   - `chat:write.public` - Send to public channels
   - `im:write` - Send DMs
   - `im:history` - Read DM history
   - `users:read` - Read user info
   - `channels:read` - Read channel info

### Event Subscriptions

1. Navigate to **"Event Subscriptions"**
2. Enable Events
3. Request URL: `http://localhost:3000/slack/events` (update after ngrok)
4. Under **"Subscribe to bot events"**, add:
   - `app_mention` - When someone @mentions the app
   - `message.im` - DMs to the app

### App Home

1. Navigate to **"App Home"**
2. Enable **"Messages Tab"**
3. Check **"Allow users to send Slash commands and messages from the messages tab"**

## Step 5: Set Up ngrok

ngrok creates a public URL for your localhost so Slack can send events.

```bash
# Install ngrok (macOS)
brew install ngrok

# Or download from https://ngrok.com/download

# Start tunnel
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### Update Slack App URLs

Go back to your Slack app settings and update:

| Setting | URL |
|---------|-----|
| Event Subscriptions → Request URL | `https://abc123.ngrok-free.app/slack/events` |

## Step 6: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Database (Supabase connection string)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Application
NODE_ENV=development
PORT=3000
```

### Get Bot Token

1. Go to **"OAuth & Permissions"** in Slack app settings
2. Click **"Install to Workspace"**
3. Authorize the app
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

## Step 7: Set Up Database Schema

Run Drizzle migrations:

```bash
# Generate migrations (if schema changed)
npx drizzle-kit generate

# Push schema to database
npx drizzle-kit push
```

## Step 8: Start Development Server

```bash
# In the backend directory
npm run dev
```

The server should start on `http://localhost:3000`

## Step 9: Test the Integration

### Test DM to App

1. In Slack, find your app under **"Apps"** in the sidebar
2. Send a message: "Hello"
3. The app should acknowledge (once implemented)

### Test App Mention

1. In a channel, mention your app: `@SUPS status`
2. The app should respond (once implemented)

## Troubleshooting

### "URL verification failed"

- Ensure ngrok is running
- Verify the Request URL matches exactly
- Check that your server is running on port 3000

### "Invalid signature"

- Verify `SLACK_SIGNING_SECRET` matches your app's signing secret
- Ensure environment variables are loaded

### "Missing scope"

- Add the required scope in Slack app settings
- Reinstall the app to workspace after adding scopes

### Database connection errors

- Verify `DATABASE_URL` is correct
- Check Supabase project is running
- Ensure your IP is allowed (Supabase → Settings → Database → Connection Pooling)

### Debug Mode

Enable verbose logging:

```bash
DEBUG=bolt* npm run dev
```

## Next Steps

- Read [PRODUCT.md](./PRODUCT.md) for user flows and features
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for roadmap

## Resources

- [Slack API Documentation](https://api.slack.com/)
- [Slack Bolt Framework](https://slack.dev/bolt-js/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Supabase Docs](https://supabase.com/docs)
- [ngrok Documentation](https://ngrok.com/docs)
