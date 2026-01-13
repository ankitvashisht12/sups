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
│         Slack App (Bolt/Express)      │
│  ┌──────────────────────────────────┐  │
│  │  Event Handlers                  │  │
│  │  - app_mention                   │  │
│  │  - message events                │  │
│  │  - slash commands                │  │
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

## Components

### 1. Slack App Layer

**Technology**: Slack Bolt Framework (Node.js) or slack-sdk (Python)

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

**Technology**: Express.js (Node.js) or FastAPI (Python)

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

**Technology**: node-cron (Node.js) or APScheduler (Python)

**Responsibilities**:
- Run daily jobs to check for reminders
- Send reminder messages at configured times
- Handle timezone conversions
- Retry failed reminders

**Implementation**:
- Cron job runs every hour
- Checks for teams with reminders scheduled in the next hour
- Sends reminders via Slack API
- Updates reminder status in database

## Data Flow

### Stand-up Submission Flow

```
User types /standup
    ↓
Slack sends command to /slack/commands
    ↓
Backend validates and processes
    ↓
Opens modal/form for stand-up input
    ↓
User submits form
    ↓
Backend receives via /slack/interactive
    ↓
Stand-up Service saves to database
    ↓
Backend sends confirmation to user
    ↓
Optionally: Post summary to channel
```

### Reminder Flow

```
Scheduler runs (hourly)
    ↓
Checks for reminders due in next hour
    ↓
For each team:
    - Get team configuration
    - Get team members/channel
    - Format reminder message
    - Send via Slack API
    ↓
Update reminder status in database
```

## Design Decisions

### Why PostgreSQL?

- Relational data fits well (teams, standups, reminders)
- ACID compliance for data integrity
- Good performance for queries
- Easy to scale

### Why Slack Bolt Framework?

- Official Slack framework
- Handles verification automatically
- Built-in middleware support
- Excellent documentation
- Active community

### Why Cron-based Scheduler?

- Simple to implement
- No additional infrastructure needed
- Sufficient for MVP
- Can upgrade to job queue later if needed

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

- Analytics dashboard
- Stand-up templates
- Integration with Jira/GitHub
- Multi-channel support
- Custom reminder messages
- Stand-up analytics and insights

