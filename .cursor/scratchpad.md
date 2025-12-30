# Personal Financial Advisor - Project Scratchpad

## Background and Motivation

Building a personal financial advisor tool powered by Claude API. The tool is specialized to Nico's specific financial situation and helps with day-to-day financial decisions.

**Architecture:**
- Frontend: React/Next.js deployed on Vercel
- Backend: Next.js API routes (same repo)
- Database: Supabase (PostgreSQL)
- AI: Claude API (claude-sonnet-4-20250514)
- Auth: None for MVP (single user)

**Key Features:**
1. Chat interface for financial advice
2. Real-time financial context (balances, budgets, goals)
3. Purchase decision assistance
4. Budget tracking and trend analysis
5. CSV import from Copilot app
6. Goal progress tracking

## Key Challenges and Analysis

### 1. Database Setup (Supabase)
- Need to create 9 tables with proper relationships
- Seed data with Nico's actual financial information
- Set up RLS (Row Level Security) - though single user for MVP

### 2. Claude API Integration
- Build comprehensive financial context from database
- Craft system prompt with all financial details
- Handle chat history for context continuity
- Keep responses concise and actionable

### 3. Real-time Financial Calculations
- Calculate "days until payday" (15th and last day of month)
- Track MTD spending vs budgets
- Compute goal progress percentages
- Enforce spending rules dynamically

### 4. CSV Import
- Parse Copilot export format
- Handle column mapping
- Dedupe against existing transactions
- Recalculate monthly summaries after import

### 5. Frontend UX
- Mobile-first chat interface
- Dark mode design
- Quick action buttons
- Header with key stats (days to payday, savings, budget remaining)

## High-level Task Breakdown

### Phase 1: Project Setup
- [x] Task 1.1: Initialize Next.js project with TypeScript
  - Success: `npm run dev` works, TypeScript compiles
- [ ] Task 1.2: Set up Supabase project and get credentials
  - Success: Can connect to Supabase from local environment
- [ ] Task 1.3: Configure environment variables
  - Success: `.env.local` has ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

### Phase 2: Database
- [ ] Task 2.1: Create all 9 database tables in Supabase
  - Success: All tables created, can query them
- [ ] Task 2.2: Seed tables with Nico's financial data
  - Success: Data visible in Supabase dashboard

### Phase 3: Backend API
- [ ] Task 3.1: Create `/api/status` endpoint
  - Success: Returns complete financial snapshot JSON
- [ ] Task 3.2: Create `/api/chat` endpoint with Claude integration
  - Success: Can send message and get financial advice response
- [ ] Task 3.3: Create `/api/accounts/:id/balance` endpoint
  - Success: Can update account balance
- [ ] Task 3.4: Create `/api/goals` endpoint
  - Success: Returns all goals with progress
- [ ] Task 3.5: Create `/api/spending/month/:month` endpoint
  - Success: Returns monthly spending summary
- [ ] Task 3.6: Create `/api/transactions/import` endpoint
  - Success: Can upload CSV and see transactions in database

### Phase 4: Frontend
- [ ] Task 4.1: Create basic chat UI component
  - Success: Can type messages and see them displayed
- [ ] Task 4.2: Integrate chat with `/api/chat` endpoint
  - Success: Get AI responses to financial questions
- [ ] Task 4.3: Add header with financial stats
  - Success: Shows days to payday, savings, budget remaining
- [ ] Task 4.4: Add quick action buttons
  - Success: Clicking buttons sends predefined questions
- [ ] Task 4.5: Style with dark mode, mobile-first
  - Success: Looks good on mobile, dark theme applied

### Phase 5: Polish & Deploy
- [ ] Task 5.1: Add CSV import UI
  - Success: Can upload file and see import results
- [ ] Task 5.2: Deploy to Vercel
  - Success: App accessible at production URL
- [ ] Task 5.3: Test all flows end-to-end
  - Success: All example interactions work as specified

## Project Status Board

### Current Sprint
- [ ] Initialize Next.js project with TypeScript

### Completed
- (none yet)

### Blocked
- (none)

## Executor's Feedback or Assistance Requests

*No requests yet - project planning phase*

## Lessons

- (To be filled as we learn things during implementation)
