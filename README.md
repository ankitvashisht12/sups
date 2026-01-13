# SUPS - Engineering Work Journal

**SUPS** (Stand-Up) is an engineering work journal and intelligence platform that starts with Slack stand-ups and grows into a comprehensive record of your professional journey.

**Today**: Automated stand-up reminders and organized updates via Slack.

**Tomorrow**: AI-powered summaries, achievement tracking, performance review prep, and career insights—all built from your daily stand-ups.

## Problem Statement

Many engineering teams use Slack threads for daily stand-ups, but this approach has limitations:

- **Manual Reminders**: Someone has to manually remind the team to post updates by a certain time
- **Unmanageable Threads**: Stand-up threads grow longer each day, making it difficult to find and review updates
- **Poor Organization**: Updates get buried in long conversation threads

SUPS automates reminders and organizes stand-up data in a structured, easy-to-access format.

## Features

### Current Scope (MVP)

- **Automated Reminders**: Send scheduled reminders to team members to post their stand-up updates
- **Organized Updates**: Collect and organize stand-up responses in a clean, searchable format
- **Slack Integration**: Native Slack app with intuitive UI for submitting and viewing updates

### Future Enhancements

See [VISION.md](docs/VISION.md) for the full roadmap, including:
- AI-powered weekly/monthly/yearly summaries
- Achievement and milestone detection
- Performance review preparation
- Knowledge graphs and team intelligence

## Project Structure

```
sups/
├── backend/          # Backend API and services
├── slack-app/        # Slack app configuration and handlers
├── docs/             # Documentation and guides
└── README.md         # This file
```

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- Slack workspace with admin permissions
- Basic understanding of Slack apps and APIs

### Quick Start

1. Clone the repository
2. Follow the setup guide in `docs/SETUP.md`
3. Deploy using instructions in `docs/DEPLOYMENT.md`

## Documentation

- [Vision](docs/VISION.md) - Product vision and long-term roadmap
- [Product Spec](docs/PRODUCT.md) - User flows, commands, and interactions
- [Tech Stack](docs/TECH_STACK.md) - Technology stack and dependencies
- [Architecture](docs/ARCHITECTURE.md) - System architecture and design decisions
- [Setup Guide](docs/SETUP.md) - Initial setup and configuration
- [Deployment Guide](docs/DEPLOYMENT.md) - How to deploy the app
- [Development Plan](docs/DEVELOPMENT_PLAN.md) - Roadmap and development phases

## Contributing

This project is open source and welcomes contributions! Please read our contributing guidelines before submitting PRs.

## License

[To be determined - MIT/Apache/etc.]

## Author

Built with ❤️ for engineers who want to own their professional story.

