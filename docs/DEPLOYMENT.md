# Deployment Guide - SUPS

This guide covers deploying the SUPS Slack integration app to production.

## Prerequisites

Before deploying, ensure you have:

- A Slack workspace with admin permissions
- A hosting provider account (Railway, Render, AWS, etc.)
- A database service (managed PostgreSQL recommended)
- Domain name (optional, for custom OAuth redirects)

## Deployment Options

### Option 1: Railway (Recommended for Beginners)

Railway provides the easiest deployment experience with automatic HTTPS and database provisioning.

#### Steps

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Connect your GitHub repository

2. **Set Up Database**
   - Create a new PostgreSQL service in Railway
   - Note the connection string

3. **Configure Environment Variables**
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_CLIENT_ID=your-client-id
   SLACK_CLIENT_SECRET=your-client-secret
   DATABASE_URL=postgresql://user:pass@host:port/db
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy**
   - Railway will auto-detect your Node.js/Python app
   - Push to main branch triggers deployment
   - Check logs for any errors

5. **Update Slack App Settings**
   - Add Railway URL to Slack app's "Request URL"
   - Format: `https://your-app.railway.app/slack/events`

### Option 2: Render

Similar to Railway but with different interface.

#### Steps

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)

2. **Create Web Service**
   - Connect GitHub repository
   - Select your backend service (Node.js/Python)
   - Add environment variables (same as Railway)

3. **Create PostgreSQL Database**
   - Add PostgreSQL service
   - Use connection string in environment variables

4. **Deploy**
   - Render will build and deploy automatically
   - Update Slack app with Render URL

### Option 3: AWS (Advanced)

For more control and scalability.

#### Steps

1. **Set Up AWS Resources**
   - EC2 instance or Elastic Beanstalk
   - RDS PostgreSQL database
   - Application Load Balancer (optional)

2. **Configure Security Groups**
   - Allow HTTPS (443) inbound
   - Allow database access from app server

3. **Deploy Application**
   - Use AWS CodeDeploy or manual deployment
   - Set up environment variables via Systems Manager

4. **Set Up SSL Certificate**
   - Use AWS Certificate Manager
   - Configure with Load Balancer or CloudFront

## Slack App Configuration

### Required Slack App Settings

1. **OAuth & Permissions**
   - Add redirect URLs: `https://your-app-domain.com/slack/oauth_redirect`
   - Required scopes:
     - `chat:write` - Send messages
     - `chat:write.public` - Send messages to channels
     - `commands` - Slash commands
     - `users:read` - Read user information
     - `channels:read` - Read channel information
     - `groups:read` - Read private channel information

2. **Event Subscriptions**
   - Request URL: `https://your-app-domain.com/slack/events`
   - Subscribe to bot events:
     - `app_mention`
     - `message.channels`
     - `message.groups`

3. **Interactivity & Shortcuts**
   - Request URL: `https://your-app-domain.com/slack/interactive`
   - Enable interactivity

4. **Slash Commands**
   - Create commands like `/standup` or `/sups`
   - Request URL: `https://your-app-domain.com/slack/commands`

## Environment Variables

### Required Variables

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Application
NODE_ENV=production
PORT=3000

# Optional: Custom configuration
REMINDER_TIME=19:00  # 7 PM in 24-hour format
TIMEZONE=America/New_York
```

### Getting Slack Credentials

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Navigate to "Basic Information"
   - Copy "Client ID" and "Client Secret"
   - Copy "Signing Secret"
4. Navigate to "OAuth & Permissions"
   - Copy "Bot User OAuth Token"

## Database Setup

### Initial Migration

Run database migrations on first deployment:

```bash
# For Node.js/Prisma
npx prisma migrate deploy

# For Python/Alembic
alembic upgrade head
```

### Backup Strategy

- Set up automated daily backups
- Test restore procedures
- Keep backups for at least 30 days

## Post-Deployment Checklist

- [ ] App responds to Slack events
- [ ] OAuth installation works
- [ ] Reminders are scheduled correctly
- [ ] Stand-up submissions are stored
- [ ] Database connections are stable
- [ ] Error logging is working
- [ ] Monitoring is set up

## Monitoring & Maintenance

### Recommended Tools

- **Error Tracking**: Sentry or Rollbar
- **Logging**: Logtail, Papertrail, or CloudWatch
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Analytics**: Slack API analytics dashboard

### Health Checks

Set up a health check endpoint:

```javascript
// Example health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

Monitor this endpoint to ensure the app is running.

## Troubleshooting

### Common Issues

1. **Slack Events Not Received**
   - Verify Request URL is correct
   - Check SSL certificate is valid
   - Ensure signing secret matches

2. **Database Connection Errors**
   - Verify DATABASE_URL is correct
   - Check database is accessible from hosting provider
   - Ensure database is running

3. **Reminders Not Sending**
   - Check scheduler is running
   - Verify bot has necessary permissions
   - Check logs for errors

## Scaling Considerations

- Use connection pooling for database
- Implement rate limiting
- Cache frequently accessed data
- Consider using Redis for job queue
- Monitor resource usage

## Security Best Practices

- Never commit secrets to repository
- Use environment variables for all sensitive data
- Enable HTTPS only
- Regularly update dependencies
- Implement proper authentication
- Rate limit API endpoints

## Rollback Procedure

1. Revert to previous deployment version
2. Restore database from backup if needed
3. Verify app functionality
4. Investigate issues before redeploying

## Support

For deployment issues, check:
- Hosting provider documentation
- Slack API status page
- Application logs
- GitHub Issues (if open source)

