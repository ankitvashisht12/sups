# Backend - SUPS

This directory contains the backend API and services for the SUPS Slack integration.

## Structure

```
backend/
├── src/
│   ├── handlers/      # Slack event handlers
│   ├── services/      # Business logic
│   ├── models/        # Database models
│   ├── utils/         # Utility functions
│   └── app.js         # Main application file
├── migrations/        # Database migrations
├── tests/            # Test files
├── package.json      # Dependencies
└── README.md         # This file
```

## Getting Started

See the main [SETUP.md](../docs/SETUP.md) guide for installation and configuration.

## Technology Stack

See [docs/TECH_STACK.md](../docs/TECH_STACK.md) for the complete technology stack.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run migrations
npm run migrate
```

## Environment Variables

See [docs/SETUP.md](../docs/SETUP.md) for required environment variables.

