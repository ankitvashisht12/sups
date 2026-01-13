# Development Plan - SUPS

This document outlines the development roadmap for building SUPS.

For product details, see [PRODUCT.md](./PRODUCT.md). For tech stack, see [TECH_STACK.md](./TECH_STACK.md).

## Overview

SUPS will be built in phases, starting with a minimal viable product (MVP) that solves the core problems, then expanding with AI features.

## Phase 1: MVP - Core Functionality (Week 1-2)

### Goals
- Set up Slack app + backend infrastructure
- Implement DM-based stand-up collection
- Create daily thread organization
- Basic reminder system

### Tasks

#### Week 1: Foundation
- [ ] **Day 1-2: Project Setup**
  - Initialize Fastify + Bolt backend
  - Set up Slack app in Slack API dashboard
  - Configure OAuth, bot tokens, event subscriptions
  - Set up ngrok for local development

- [ ] **Day 3-4: Slack Integration**
  - Handle `message.im` events (DM submissions)
  - Handle `app_mention` events (@SUPS commands)
  - Implement DM acknowledgment responses
  - Test basic Slack interactions

- [ ] **Day 5: Database Setup**
  - Set up Supabase project
  - Create Drizzle schema (teams, standups, users)
  - Push migrations to database
  - Test database connections

#### Week 2: Core Features
- [ ] **Day 1-2: Stand-up Collection**
  - Collect DM messages throughout the day
  - Aggregate messages per user per day
  - Store submissions in database
  - Send acknowledgment DMs

- [ ] **Day 3-4: Public Display**
  - Create daily parent message in #standup
  - Post aggregated updates as thread replies
  - Handle late submissions (post immediately with "late" tag)
  - Implement `@SUPS status` command

- [ ] **Day 5: Reminder System**
  - Set up cron-job.org triggers
  - Implement `/api/check-reminders` endpoint
  - Send DM reminders to users who haven't submitted
  - Tag missing users in channel at deadline

## Phase 2: Admin & Configuration (Week 3-4)

### Goals
- Admin setup flow
- Team configuration
- Leave/vacation handling

### Tasks
- [ ] Admin setup wizard (first-time install)
- [ ] `@SUPS config` command with modal
- [ ] Add/remove team members
- [ ] Leave/vacation handling (`vacation until [date]`)
- [ ] Skip today functionality
- [ ] Custom reminder/deadline times per team

## Phase 3: AI & Insights (Week 5+)

### Goals
- AI-powered features
- Search and summaries
- Deploy to production

### Tasks
- [ ] `@SUPS summarize` - AI summary of daily updates
- [ ] `@SUPS who worked on X?` - Search across updates
- [ ] Weekly digest auto-post
- [ ] Deploy to Render
- [ ] Set up cron-job.org
- [ ] Production monitoring

## Future Phases

See [VISION.md](./VISION.md) for long-term roadmap including:
- Performance review preparation
- Achievement detection
- Knowledge graphs
- Analytics dashboard

## Milestones

- [ ] **Milestone 1**: DMs to app are acknowledged
- [ ] **Milestone 2**: Updates posted to daily thread in #standup
- [ ] **Milestone 3**: Reminders sent at configured time
- [ ] **Milestone 4**: `@SUPS status` shows who's submitted
- [ ] **Milestone 5**: MVP deployed to Render
- [ ] **Milestone 6**: AI summarize feature working

## Next Steps

1. Review [PRODUCT.md](./PRODUCT.md) for user flows
2. Review [TECH_STACK.md](./TECH_STACK.md) for setup
3. Follow [SETUP.md](./SETUP.md) for local development
4. Start with Day 1 tasks

## Resources

- [Slack Bolt Framework](https://slack.dev/bolt-js/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Supabase](https://supabase.com/docs)

