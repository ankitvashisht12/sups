# Architecture - SUPS

This document describes the system architecture and design decisions for the SUPS Slack integration.

## Overview

SUPS is a Slack app that automates stand-up reminders and organizes stand-up submissions. It consists of:

1. **Slack App Layer**: Handles Slack events, commands, and interactions
2. **Backend API**: Processes requests and manages business logic
3. **Database**: Stores stand-up data, schedules, and user preferences
4. **Scheduler**: Sends automated reminders at configured times

## System Architecture

```
┌─────────────┐
│   Slack     │
│  Workspace  │
└──────┬──────┘
       │
       │ Events, Commands, Interactions
       │
┌──────▼─────────────────────────────────┐
│         Slack App (Bolt/Fastify)      │
│  ┌──────────────────────────────────┐  │
│  │  Event Handlers                  │  │
│  │  - app_mention (@SUPS commands)  │  │
│  │  - message.im (DM submissions)   │  │
│  │  - interactive components        │  │
│  └──────────────────────────────────┘  │
└──────┬─────────────────────────────────┘
       │
       │ API Calls
       │
┌──────▼─────────────────────────────────┐
│         Backend Services               │
│  ┌──────────────────────────────────┐  │
│  │  Stand-up Service                │  │
│  │  - Submit stand-up               │  │
│  │  - Retrieve stand-ups            │  │
│  │  - Organize by date/channel      │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Reminder Service                │  │
│  │  - Schedule reminders            │  │
│  │  - Send notifications            │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  User/Team Service               │  │
│  │  - Manage teams                  │  │
│  │  - User preferences              │  │
│  └──────────────────────────────────┘  │
└──────┬─────────────────────────────────┘
       │
       │ Database Queries
       │
┌──────▼─────────────────────────────────┐
│         Database (PostgreSQL)          │
│  ┌──────────────────────────────────┐  │
│  │  Tables:                         │  │
│  │  - teams                         │  │
│  │  - standups                      │  │
│  │  - reminders                     │  │
│  │  - users                         │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Scheduler (Cron/Job Queue)      │
│  - Daily reminder jobs                  │
│  - Timezone-aware scheduling            │
└─────────────────────────────────────────┘
```

## Tech Stack

See [TECH_STACK.md](./TECH_STACK.md) for the complete technology stack.

## Components

### 1. Slack App Layer

**Responsibilities**:
- Receive and verify Slack events
- Handle slash commands
- Process interactive components (modals, buttons)
- Send messages to Slack channels
- Manage OAuth flow

**Key Endpoints**:
- `/slack/events` - Event subscription endpoint
- `/slack/commands` - Slash command handler
- `/slack/interactive` - Interactive component handler
- `/slack/oauth_redirect` - OAuth callback

### 2. Backend Services

**Services**:

#### Stand-up Service
- Submit stand-up updates
- Retrieve stand-ups by date, channel, or user
- Format stand-ups for display
- Generate daily summaries

#### Reminder Service
- Schedule daily reminders
- Send reminder messages to channels
- Handle timezone conversions
- Track reminder delivery status

#### User/Team Service
- Manage team configurations
- Store user preferences
- Handle team membership

### 3. Database Schema

#### Teams Table
```sql
teams
- id (UUID, PK)
- slack_team_id (String, Unique)
- team_name (String)
- reminder_time (Time)
- reminder_timezone (String)
- reminder_channel_id (String)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### Standups Table
```sql
standups
- id (UUID, PK)
- team_id (UUID, FK -> teams.id)
- user_id (String)  # Slack user ID
- user_name (String)
- channel_id (String)
- message_ts (String)  # Slack message timestamp
- content (Text)
- date (Date)
- created_at (Timestamp)
```

#### Reminders Table
```sql
reminders
- id (UUID, PK)
- team_id (UUID, FK -> teams.id)
- scheduled_date (Date)
- sent_at (Timestamp, Nullable)
- status (Enum: pending, sent, failed)
- created_at (Timestamp)
```

#### Users Table (Optional)
```sql
users
- id (UUID, PK)
- slack_user_id (String, Unique)
- team_id (UUID, FK -> teams.id)
- preferences (JSON)
- created_at (Timestamp)
```

### 4. Scheduler

**Responsibilities**:
- Run daily jobs to check for reminders
- Send reminder messages at configured times
- Handle timezone conversions
- Retry failed reminders

**Implementation**:
- External cron service triggers `/api/check-reminders` endpoint hourly
- Checks for teams with reminders scheduled in the next hour
- Sends reminders via Slack API
- Updates reminder status in database

## User Flows

For detailed user flows, commands, and interactions, see [PRODUCT.md](./PRODUCT.md).

### Stand-up Submission Flow (Summary)

```
User DMs app throughout the day
    ↓
App acknowledges each message
    ↓
App aggregates all messages
    ↓
At deadline: App posts to #standup thread
    ↓
Stand-up Service saves to database
```

### Reminder Flow (Summary)

```
cron-job.org triggers /api/check-reminders (hourly)
    ↓
Check for teams with reminder time in next hour
    ↓
For each team:
    - DM users who haven't submitted
    - At deadline: post updates to channel
    - Tag missing users
    ↓
Update reminder status in database
```

### Daily Timeline

```
Reminder Time (e.g., 7 PM)  → DM users who haven't submitted
Deadline (e.g., 8 PM)       → Post all updates to #standup thread
End of Day (11:59 PM)       → Close day, mark missing as "missed"
```

## Design Decisions

See [TECH_STACK.md](./TECH_STACK.md) for technology choices and rationale.

## Security Considerations

1. **Request Verification**: All Slack requests are verified using signing secret
2. **Token Storage**: Bot tokens stored securely in environment variables
3. **Database Security**: Use parameterized queries to prevent SQL injection
4. **HTTPS Only**: All endpoints require HTTPS in production
5. **Rate Limiting**: Implement rate limiting on API endpoints

## Scalability Considerations

### Current (MVP)
- Single server instance
- Cron-based scheduler
- Direct database connections

### Future Enhancements
- **Job Queue**: Use Redis/Bull for distributed job processing
- **Caching**: Redis for frequently accessed data
- **Load Balancing**: Multiple app instances behind load balancer
- **Database Replication**: Read replicas for better performance
- **CDN**: For static assets (if any)

## Error Handling

- **Slack API Errors**: Retry with exponential backoff
- **Database Errors**: Log and notify administrators
- **Scheduler Failures**: Retry mechanism with dead letter queue
- **User Errors**: Friendly error messages in Slack

## Monitoring & Logging

- **Application Logs**: Structured logging (JSON format)
- **Error Tracking**: Sentry or similar
- **Metrics**: Response times, error rates, reminder delivery rates
- **Alerts**: Failed reminders, high error rates, downtime

## Future Enhancements

See [VISION.md](./VISION.md) for the complete product roadmap, including:

- AI-powered summaries and insights
- Achievement and milestone detection
- Performance review preparation
- Knowledge graphs and team intelligence
- Analytics dashboard

