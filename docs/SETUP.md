# Setup Guide - SUPS

This guide will help you set up the SUPS Slack integration app for local development.

## Prerequisites

- **Node.js** v18 or higher (or Python 3.9+)
- **npm** or **yarn** (or pip for Python)
- **Git**
- **Slack Workspace** with admin permissions
- **ngrok** or similar tunneling tool (for local development)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd sups

# Navigate to backend directory
cd backend

# Install dependencies
npm install  # or yarn install
```

## Step 2: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app: "SUPS" (or your preferred name)
4. Select your workspace
5. Click "Create App"

## Step 3: Configure Slack App

### Basic Information

1. Go to "Basic Information" in the sidebar
2. Note down:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

### OAuth & Permissions

1. Navigate to "OAuth & Permissions"
2. Add Redirect URL (we'll update this after ngrok setup):
   ```
   http://localhost:3000/slack/oauth_redirect
   ```
3. Scroll down to "Scopes" → "Bot Token Scopes" and add:
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to channels
   - `commands` - Slash commands
   - `users:read` - Read user information
   - `channels:read` - Read channel information
   - `groups:read` - Read private channel information

### Event Subscriptions

1. Navigate to "Event Subscriptions"
2. Enable Events
3. Request URL: `http://localhost:3000/slack/events` (update after ngrok)
4. Subscribe to bot events:
   - `app_mention`
   - `message.channels`
   - `message.groups`

### Interactivity & Shortcuts

1. Navigate to "Interactivity & Shortcuts"
2. Enable Interactivity
3. Request URL: `http://localhost:3000/slack/interactive` (update after ngrok)

### Slash Commands

1. Navigate to "Slash Commands"
2. Create a new command:
   - Command: `/standup` or `/sups`
   - Request URL: `http://localhost:3000/slack/commands` (update after ngrok)
   - Short description: "Submit your daily stand-up update"
   - Usage hint: "[optional: what you did yesterday, today, blockers]"

## Step 4: Set Up Local Environment

### Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Start ngrok Tunnel

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Update Slack App URLs

Go back to your Slack app settings and update all Request URLs with your ngrok URL:
- Event Subscriptions: `https://abc123.ngrok.io/slack/events`
- Interactivity: `https://abc123.ngrok.io/slack/interactive`
- Slash Commands: `https://abc123.ngrok.io/slack/commands`
- OAuth Redirect: `https://abc123.ngrok.io/slack/oauth_redirect`

## Step 5: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Database (for local development, use SQLite or local PostgreSQL)
DATABASE_URL=postgresql://localhost:5432/sups_dev
# Or for SQLite:
# DATABASE_URL=file:./dev.db

# Application
NODE_ENV=development
PORT=3000

# Optional Configuration
REMINDER_TIME=19:00
TIMEZONE=America/New_York
```

### Get Bot Token

1. Go to "OAuth & Permissions" in Slack app settings
2. Scroll to "OAuth Tokens for Your Workspace"
3. Click "Install to Workspace"
4. Authorize the app
5. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## Step 6: Set Up Database

### Option 1: PostgreSQL (Recommended)

```bash
# Install PostgreSQL (if not installed)
# macOS
brew install postgresql
brew services start postgresql

# Create database
createdb sups_dev
```

### Option 2: SQLite (Easier for Development)

No setup needed - SQLite will create the database file automatically.

### Run Migrations

```bash
# For Node.js/Prisma
npx prisma migrate dev

# For Python/Alembic
alembic upgrade head
```

## Step 7: Start Development Server

```bash
# In the backend directory
npm run dev  # or yarn dev
```

The server should start on `http://localhost:3000`

## Step 8: Install App to Workspace

1. Go to your Slack app's "OAuth & Permissions" page
2. Click "Install to Workspace"
3. Authorize the app
4. You should see a success message

## Step 9: Test the Integration

### Test Slash Command

1. Open any Slack channel
2. Type `/standup` (or your configured command)
3. You should see a response from the app

### Test App Mention

1. In a channel, mention your app: `@SUPS help`
2. The app should respond

## Troubleshooting

### Common Issues

1. **"URL verification failed"**
   - Ensure ngrok is running
   - Verify the Request URL matches exactly
   - Check that your server is running

2. **"Invalid signature"**
   - Verify SLACK_SIGNING_SECRET matches your app's signing secret
   - Ensure environment variables are loaded correctly

3. **"Missing scope"**
   - Check that all required scopes are added
   - Reinstall the app to workspace after adding scopes

4. **Database connection errors**
   - Verify DATABASE_URL is correct
   - Ensure database is running
   - Check database credentials

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* npm run dev
```

## Next Steps

- Read [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for development roadmap
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Start implementing features!

## Resources

- [Slack API Documentation](https://api.slack.com/)
- [Slack Bolt Framework](https://slack.dev/bolt-js/)
- [ngrok Documentation](https://ngrok.com/docs)

