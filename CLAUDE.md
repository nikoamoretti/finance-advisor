# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Next.js development server (http://localhost:3000)

# Building
npm run build           # Build production Next.js app
npm run start           # Start production server

# Linting
npm run lint            # Run ESLint

# Database
npm run seed            # Seed database with initial data
node --env-file=.env.local scripts/seed.mjs  # Alternative seed command with env file
```

## Architecture Overview

This is a personal financial advisor application built with:

- **Frontend**: Next.js 16.1.1 App Router with React 19, TypeScript, and Tailwind CSS
- **Backend**: Next.js API routes (serverless)
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Anthropic Claude API for financial advice

### Key API Routes

- `/api/chat` - AI chat endpoint that builds full financial context
- `/api/status` - Returns comprehensive financial snapshot
- `/api/accounts/[id]` - Account balance updates
- `/api/goals` - Financial goals CRUD
- `/api/transactions/import` - CSV transaction import
- `/api/onboarding/[step]` - Multi-step onboarding flow

### Database Schema

The application uses these core tables:
- `user_config` - User profile and income settings
- `accounts` - All financial accounts (checking, savings, credit, investment)
- `debts` - Debt tracking with interest rates and payment schedules
- `budget_categories` - Categories with fixed/variable flags and budgets
- `goals` - Financial goals with priority levels
- `transactions` - Imported transaction history
- `monthly_summaries` - Aggregated monthly financial data
- `rules` - Decision rules for AI advice
- `chat_history` - AI conversation history

### Core Features

1. **AI Financial Advisor**: Chat interface using Claude with full financial context
2. **Smart Categorization**: Automated transaction categorization engine (`/src/lib/categorization-engine.ts`)
3. **Real-time Dashboard**: Visual status with days to payday, budgets, and goals
4. **Onboarding Flow**: Multi-step setup for new users
5. **Transaction Import**: CSV import with deduplication

### Key Implementation Details

- **Financial Context**: The `/api/chat` endpoint builds comprehensive context including all accounts, debts, budgets, goals, and recent transactions
- **Pay Schedule**: Handles semi-monthly pay (15th and last day of month)
- **Capital One Promo**: Special tracking for 0% APR promo ending May 2025
- **Category Management**: UI for managing budget categories with AI-powered categorization

### Development Notes

- Environment variables are stored in `.env.local` (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
- The app uses Tailwind CSS v4 with a dark theme (Zinc color palette)
- All monetary values are stored as DECIMAL in PostgreSQL
- Dates use ISO format (YYYY-MM-DD)
- The seed script (`scripts/seed.mjs`) populates initial financial data