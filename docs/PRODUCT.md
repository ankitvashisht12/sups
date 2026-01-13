# Product Specification - SUPS

This document describes how SUPS works from a user perspective—the flows, commands, and interactions.

## Overview

SUPS automates stand-up collection through Slack DMs and organizes updates in a public channel with daily threads.

```
User DMs app throughout the day → App aggregates → Posts to #standup thread
```

---

## Core Concepts

### Channels & Spaces

| Space | Purpose |
|-------|---------|
| **App DM** | Where users submit updates (private, natural) |
| **#standup channel** | Where updates are displayed publicly (organized by day) |

### Daily Thread Structure

The #standup channel uses **one parent message per day** with updates as thread replies:

```
#standup
│
├─ 📅 Monday, January 13, 2026
│   ├─ 🧑 Ankit: Fixed login bug, shipping auth tomorrow...
│   ├─ 👩 Sarah: Code reviews, blocked on API docs...
│   └─ 👨 Mike: Sprint planning, will start payments feature...
│
├─ 📅 Tuesday, January 14, 2026
│   ├─ 🧑 Ankit: Shipped auth! Starting dashboard...
│   └─ ...
```

---

## User Flows

### 1. Reminder Flow

**When:** Configurable time (default: 6:45 PM)

**Step 1: DM Reminder**
```
┌─────────────────────────────────────────────────┐
│  SUPS App (DM)                                  │
│                                                 │
│  Hey! 👋 Time for your stand-up.               │
│  Just reply here with what you worked on today. │
│                                                 │
│  You can send multiple messages - I'll collect  │
│  everything and post it to #standup.            │
└─────────────────────────────────────────────────┘
```

**Step 2: Channel Reminder (at deadline)**

If users haven't submitted by the deadline (e.g., 7:00 PM):

```
#standup channel:

SUPS: ⏰ Stand-up reminder! Waiting on: @Mike, @Lisa
```

---

### 2. Submission Flow

**How users submit:** Reply to the app's DM naturally throughout the day.

**Example - Multiple updates:**

```
┌─────────────────────────────────────────────────┐
│  SUPS App (DM)                                  │
│                                                 │
│  [2:30 PM]                                      │
│  User: Fixed the login bug finally!             │
│                                                 │
│  SUPS: Got it! ✅                               │
│                                                 │
│  [4:15 PM]                                      │
│  User: Also had a meeting with design team      │
│        about the new dashboard                  │
│                                                 │
│  SUPS: Added! ✅                                │
│                                                 │
│  [6:00 PM]                                      │
│  User: Tomorrow I'll start on the auth flow     │
│                                                 │
│  SUPS: Added! ✅ I'll post your update to       │
│        #standup at 7 PM.                        │
└─────────────────────────────────────────────────┘
```

**Key behaviors:**
- User can send multiple messages throughout the day
- App acknowledges each message
- App aggregates all messages into one update
- App auto-posts to #standup at the configured time (or when user says "done")

---

### 3. Public Display Flow

**When:** At the deadline time (e.g., 7:00 PM) or when triggered

**What happens:**
1. App creates daily parent message (if not exists): "📅 Stand-ups for [Date]"
2. App posts each user's aggregated update as a thread reply
3. Updates are formatted nicely with user's name/avatar

**Example thread:**

```
📅 Stand-ups for Monday, January 13, 2026
│
├─ 🧑 Ankit Vashisht
│   • Fixed the login bug finally!
│   • Had a meeting with design team about the new dashboard
│   • Tomorrow: Start on the auth flow
│
├─ 👩 Sarah Chen
│   • Completed code reviews for payments PR
│   • Blocked on API documentation from backend team
│   • Tomorrow: Continue payments integration
│
└─ 👨 Mike Johnson
│   • Sprint planning and backlog grooming
│   • Helped debug production issue
│   • Tomorrow: Start new feature work
```

---

## Commands & Mentions

### App Mentions (in #standup channel)

| Command | Description | Example Response |
|---------|-------------|------------------|
| `@SUPS status` | Who's submitted today? | "✅ Submitted: Ankit, Sarah \| ❌ Missing: Mike, Lisa" |
| `@SUPS summarize` | AI summary of today's updates | "Team focused on auth and payments. Mike blocked on API docs." |
| `@SUPS who worked on [topic]?` | Search across updates | "Ankit mentioned auth on Jan 13, Sarah on Jan 10..." |

### Status Command

```
User: @SUPS status

SUPS: 📊 Stand-up Status for Monday, Jan 13

✅ Submitted (3):
   • Ankit Vashisht - 2:30 PM
   • Sarah Chen - 4:00 PM
   • Mike Johnson - 7:30 PM

🕐 Submitted Late (1):
   • Lisa Park - 8:30 PM

🏖️ On Leave (1):
   • David Kim (back Jan 20)

❌ Missing (1):
   • John Smith
```

### Summarize Command

```
User: @SUPS summarize

SUPS: 📝 Today's Summary

Team Focus:
• Authentication flow (Ankit)
• Payments integration (Sarah)
• Sprint planning (Mike)

Blockers:
• API documentation needed (Sarah)

Tomorrow:
• Auth flow shipping (Ankit)
• Payments continuation (Sarah)
• New feature kickoff (Mike)
```

### Search Command

```
User: @SUPS who worked on authentication?

SUPS: 🔍 Updates mentioning "authentication":

• Ankit (Jan 13): "Tomorrow I'll start on the auth flow"
• Ankit (Jan 12): "Researching auth providers"
• Sarah (Jan 8): "Reviewed auth PR from Ankit"
```

---

## Admin vs User Controls

### How Permissions Work

Slack doesn't have a built-in admin panel for apps. SUPS handles permissions through its own logic:

| Level | Who | What they control |
|-------|-----|-------------------|
| **App Installer** | Person who adds app to workspace | Becomes default admin |
| **Admins** | Designated by installer | Team settings, user management |
| **Users** | Team members | Personal settings only |

### Admin Controls (Team Level)

Only admins can change these:

| Setting | Description | Default |
|---------|-------------|---------|
| `reminder_time` | When to send DM reminders | 7:00 PM |
| `deadline_time` | When to post updates + tag missing | 8:00 PM |
| `end_of_day_time` | Final cutoff for the day | 11:59 PM |
| `standup_channel` | Channel for public updates | #standup |
| `timezone` | Team timezone | America/New_York |
| `reminder_days` | Which days to send reminders | Mon-Fri |
| `team_members` | Who participates in stand-ups | All channel members |

### User Controls (Personal)

Each user can set for themselves:

| Setting | Description | How to set |
|---------|-------------|------------|
| `skip_today` | Skip today's stand-up | DM: "skip today" |
| `on_leave_until` | Vacation mode | DM: "vacation until Jan 20" |
| `personal_reminder_offset` | Get reminded earlier/later | DM: "remind me 30 min early" |

---

## Admin Setup Flow

### First-Time Installation

When someone installs SUPS, they receive a setup wizard:

```
┌─────────────────────────────────────────────────────────────────────┐
│  SUPS App (DM to installer)                                         │
│                                                                     │
│  Welcome to SUPS! 👋 Let's set up your team's stand-ups.            │
│                                                                     │
│  1️⃣ Which channel for stand-ups?                                    │
│     [Select Channel ▼]                                              │
│                                                                     │
│  2️⃣ Reminder time? (when to nudge people)                           │
│     [7:00 PM ▼]                                                     │
│                                                                     │
│  3️⃣ Deadline? (when to post updates + tag missing)                  │
│     [8:00 PM ▼]                                                     │
│                                                                     │
│  4️⃣ Timezone?                                                       │
│     [America/New_York ▼]                                            │
│                                                                     │
│  5️⃣ Which days?                                                     │
│     [✓Mon] [✓Tue] [✓Wed] [✓Thu] [✓Fri] [ Sat] [ Sun]                │
│                                                                     │
│  [Save Configuration]                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Admin Commands

| Command | What it does |
|---------|--------------|
| `@SUPS config` | Opens configuration modal |
| `@SUPS add @user` | Add user to stand-up roster |
| `@SUPS remove @user` | Remove user from roster |
| `@SUPS set @user on-leave [dates]` | Set leave for a user |
| `@SUPS admins` | List who can configure |
| `@SUPS add-admin @user` | Grant admin access to user |
| `@SUPS remove-admin @user` | Revoke admin access |

### Config Command Example

```
Admin: @SUPS config

┌─────────────────────────────────────────────────────────────────────┐
│  SUPS Configuration                                                 │
│                                                                     │
│  Stand-up Channel: #standup                    [Change]             │
│  Reminder Time: 7:00 PM                        [Change]             │
│  Deadline Time: 8:00 PM                        [Change]             │
│  End of Day: 11:59 PM                          [Change]             │
│  Timezone: America/New_York                    [Change]             │
│  Active Days: Mon, Tue, Wed, Thu, Fri          [Change]             │
│                                                                     │
│  Team Members (5):                                                  │
│  • Ankit, Sarah, Mike, Lisa, John              [Manage]             │
│                                                                     │
│  Admins (2):                                                        │
│  • Ankit, Sarah                                [Manage]             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Daily Timeline with Late Workers

The day has three key times:

```
┌─────────────────────────────────────────────────────────────────────┐
│  7:00 PM - REMINDER TIME                                            │
│  ───────────────────────                                            │
│  • App DMs all team members who haven't submitted                   │
│  • "Hey! Time for your stand-up 📝"                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  8:00 PM - DEADLINE                                                 │
│  ─────────────────────                                              │
│  • App creates daily thread: "📅 Stand-ups for Jan 13"              │
│  • Posts ALL collected updates to thread                            │
│  • Tags missing users: "⏰ Waiting on: @Mike, @Lisa"                │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  8:00 PM - 11:59 PM - LATE SUBMISSIONS                              │
│  ─────────────────────────────────────                              │
│  • App still accepts DM updates                                     │
│  • Posts to thread IMMEDIATELY with "(late)" tag                    │
│  • "🕐 Mike (late): Finished debugging prod issue..."               │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  11:59 PM - END OF DAY                                              │
│  ─────────────────────                                              │
│  • Final status update (optional)                                   │
│  • Anyone who didn't submit marked as "missed"                      │
│  • Day closes, next day's stand-up begins                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Leave & Vacation Handling

### User Self-Service

Users can set their own leave:

```
User DMs: vacation until Jan 20

SUPS: Got it! 🏖️ You won't receive reminders until Jan 20.
      Your status will show as "On Leave" in stand-ups.
```

```
User DMs: skip today

SUPS: ✅ Skipping today's stand-up. See you tomorrow!
```

### Admin Override

Admins can set leave for users:

```
Admin: @SUPS set @Mike on-leave Jan 15-20

SUPS: ✅ Mike marked as on leave Jan 15-20.
      They won't receive reminders during this period.
```

### Status Display with Leave

```
User: @SUPS status

SUPS: 📊 Stand-up Status for Monday, Jan 13

✅ Submitted (2):
   • Ankit Vashisht - 6:45 PM
   • Sarah Chen - 7:30 PM (late)

🏖️ On Leave (1):
   • Mike Johnson (back Jan 20)

❌ Missed (1):
   • Lisa Park
```

---

## Edge Cases

### Late submissions (after deadline)
- App still accepts DM updates after deadline
- Posts to thread immediately with "(late)" indicator
- Updates status from "missed" to "submitted (late)"
- Example: "🕐 Mike (late): Finished debugging prod issue..."

### Very late submissions (after end of day)
- If someone submits at 1 AM, it goes to the PREVIOUS day's thread
- Only if submitted before the next day's deadline
- After that, treated as next day's update

### User sends empty/unclear message
- App asks for clarification: "Could you tell me more about what you worked on?"

### No updates for a day
- App still creates daily parent message
- Shows "No stand-ups submitted today" in the thread
- Missing users still tagged at deadline

### Weekend submissions
- App accepts but doesn't send reminders (unless weekend configured)
- Posts to appropriate day's thread

### User on leave
- No reminders sent
- Status shows "🏖️ On Leave"
- Not counted in "missing" list

### User skips a day
- No reminder for that day
- Status shows "⏭️ Skipped"
- Not counted in "missing" list

---

## Notification Summary

| Event | Where | Who | When |
|-------|-------|-----|------|
| Reminder to submit | DM | Users who haven't submitted | Reminder time |
| Update acknowledged | DM | Submitting user | Immediately |
| All updates posted | #standup thread | Visible to all | Deadline |
| Missing users tagged | #standup channel | @mention missing | Deadline |
| Late update posted | #standup thread | Visible to all | Immediately after late submit |
| Updated missing list | #standup channel | @mention still missing | After late submit |

---

## Example Day Timeline

```
9:00 AM   → Day starts (stand-up collection begins)

2:30 PM   → Ankit DMs app: "Fixed login bug"
          → App: "Got it! ✅"

4:00 PM   → Sarah DMs app: "Code reviews, blocked on docs"
          → App: "Got it! ✅"

7:00 PM   → REMINDER TIME
          → App DMs Mike: "Hey! 👋 Time for your stand-up."
          → App DMs Lisa: "Hey! 👋 Time for your stand-up."
          → App DMs John: "Hey! 👋 Time for your stand-up."
          (Ankit & Sarah already submitted, no reminder for them)

7:30 PM   → Mike DMs app: "Sprint planning, helping debug prod"
          → App: "Got it! ✅"

8:00 PM   → DEADLINE
          → App creates thread: "📅 Stand-ups for Monday, Jan 13"
          → App posts Ankit's update to thread
          → App posts Sarah's update to thread
          → App posts Mike's update to thread
          → App posts: "⏰ Waiting on: @Lisa, @John"

8:30 PM   → Lisa DMs app: "Sorry, was in meeting. Did UX review"
          → App IMMEDIATELY posts to thread: "🕐 Lisa (late): Did UX review..."
          → App updates channel: "⏰ Still waiting on: @John"

9:00 PM   → PM: "@SUPS status"
          → App: "✅ Submitted: Ankit, Sarah, Mike, Lisa (late) | ❌ Missing: John"

10:30 PM  → John DMs app: "Was working late. Fixed critical prod bug"
          → App IMMEDIATELY posts to thread: "🕐 John (late): Fixed critical prod bug..."

11:00 PM  → PM: "@SUPS summarize"
          → App: AI summary including all updates (including late ones)

11:59 PM  → END OF DAY
          → Day closes
          → Final status: Everyone submitted (2 late)

12:00 AM  → Next day begins
          → New stand-up collection starts
```

---

## Future Enhancements

- **Slash commands**: `/standup` to open modal form (alternative to DM)
- **Reactions**: React with ✅ to mark blocker resolved
- **Threads**: Reply to someone's update to discuss
- **Weekly digest**: Auto-post weekly summary on Fridays
- **Dashboard**: Web UI to browse historical updates
