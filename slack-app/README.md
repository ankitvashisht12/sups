# Slack App - SUPS

This directory contains Slack app-specific configuration and handlers.

## Structure

```
slack-app/
├── config/           # Slack app configuration
├── blocks/           # Slack Block Kit UI components
├── modals/           # Modal definitions
├── messages/         # Message templates
└── README.md         # This file
```

## Slack App Configuration

The Slack app is configured through the [Slack API Dashboard](https://api.slack.com/apps).

Key configuration areas:
- OAuth & Permissions
- Event Subscriptions
- Interactivity & Shortcuts
- Slash Commands

See [docs/SETUP.md](../docs/SETUP.md) for detailed setup instructions.

## Block Kit Components

Slack Block Kit is used to create rich, interactive UI components. Common components include:
- Stand-up submission form (modal)
- Daily stand-up summary (message blocks)
- Reminder messages

## Message Templates

Reusable message templates for:
- Reminder notifications
- Stand-up confirmations
- Error messages
- Help messages

