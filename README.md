# SplitSync

A full-stack group expense splitting application with AI-powered receipt scanning, real-time notifications, personal budgeting, and analytics — built on Next.js and Supabase.

## Overview

SplitSync helps groups of people track shared expenses, calculate who owes whom, and settle debts with minimal friction. Whether it's a trip with friends, shared rent, or a dinner bill, SplitSync handles the math and keeps everyone on the same page.

**The problem:** Splitting expenses manually leads to forgotten payments, disputes, and spreadsheet fatigue. Existing solutions are often closed-source, ad-heavy, or lack transparency in how balances are calculated.

**Who it's for:** Roommates, travel groups, couples, and anyone who regularly shares costs.

**What makes it different:**
- AI receipt scanning extracts itemized data from photos using Google's Gemini API
- Multiple split modes (equal, exact amounts, percentage-based) with cent-accurate rounding
- A greedy debt-simplification algorithm that minimizes the number of transfers needed
- Row-Level Security on every table — users can only access data they're authorized to see
- Personal expense tracking with monthly budgets, independent of group activity
- Real-time notification delivery via Supabase Realtime (Postgres changes)
- PWA-ready with a web app manifest for mobile home screen installation

## Features

| Feature | Description |
|---|---|
| **Group Expenses** | Create groups, add members by username, and log shared expenses |
| **Flexible Splitting** | Equal, exact-amount, and percentage-based splits with rounding correction |
| **Balance Calculation** | Net balance computation across all expenses and splits per group |
| **Debt Simplification** | Greedy algorithm minimizes the number of settlement transactions |
| **Settle Up** | One-tap settlement that creates an offsetting expense and recalculates balances |
| **Individual Tracking** | 1-to-1 expense groups for tracking debts between two people |
| **AI Receipt Scanner** | Photograph a receipt; Gemini extracts merchant, items, tax, and total |
| **Personal Expenses** | Track personal spending with 13 categories, independent of groups |
| **Monthly Budgets** | Set and track monthly spending limits with category-level budgets |
| **Analytics Dashboard** | Category breakdowns, monthly trends, group comparisons, and top expenses |
| **Notifications** | Real-time in-app notifications for new expenses, settlements, and member joins |
| **Activity Feed** | Chronological log of all expense and settlement activity per group |
| **Authentication** | Email/password signup and login via Supabase Auth with profile management |
| **PWA Support** | Web app manifest with icons for installable mobile experience |

## Screenshots

> **Note:** Screenshots are not yet available. To add them, place images in a `docs/screenshots/` directory and reference them here.

```
docs/
  screenshots/
    dashboard.png
    group-view.png
    receipt-scanner.png
    analytics.png
    expenses.png
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
│                                                         │
│  app/          React pages (Next.js App Router)         │
│  components/   Reusable UI components                   │
│  services/     Data-access layer (Supabase queries)     │
│  lib/          Supabase client, hooks, animation config │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               │ Supabase JS SDK      │ fetch (server-side)
               │                      │
┌──────────────▼──────────────┐  ┌────▼───────────────────┐
│     Supabase (BaaS)         │  │  Next.js API Routes    │
│                             │  │                        │
│  Auth    (email/password)   │  │  /api/scan-receipt     │
│  PostgREST  (CRUD API)     │  │    ↓                   │
│  Realtime   (notifications) │  │  Google Gemini API     │
│  PostgreSQL (data store)    │  │  (receipt OCR)         │
│  RLS policies (per-table)  │  │                        │
└─────────────────────────────┘  └────────────────────────┘
```

**Data flow:**
1. UI components call functions in the `services/` layer
2. Services interact with Supabase via the JS SDK (PostgREST under the hood)
3. PostgreSQL enforces Row-Level Security on every query
4. Real-time notification subscriptions use Supabase Realtime (Postgres changes)

**AI receipt scanning flow:**
1. Client captures a receipt image and sends base64 data to `/api/scan-receipt`
2. The Next.js API route forwards the image to Google Gemini with a structured prompt
3. Gemini returns JSON with merchant, items, tax, and total
4. The API route validates, sanitizes, and returns the parsed data to the client
5. The Gemini API key stays server-side and is never exposed to the browser

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React Compiler) |
| **UI** | React 19, Framer Motion, Lucide React icons |
| **Styling** | Tailwind CSS 4 |
| **Mobile UX** | react-swipeable (gesture support), PWA manifest |
| **Database** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth (email/password) |
| **Real-time** | Supabase Realtime (Postgres changes) |
| **AI** | Google Gemini API (receipt OCR via server-side API route) |
| **Linting** | ESLint 9 with eslint-config-next |

## Engineering Highlights

- **Service-layer architecture** — All data access is isolated in `services/` with a consistent `{ success, data, error }` return pattern. UI components never call Supabase directly.
- **Greedy debt simplification** — The `simplifyDebts()` algorithm sorts creditors and debtors by magnitude and greedily matches them, minimizing the number of settlement transactions.
- **Cent-accurate splitting** — Equal splits distribute remainder cents across the first _N_ members rather than rounding, preventing ledger drift. Percentage splits patch the rounding difference onto the first user.
- **Row-Level Security** — Every user-data table (`groups`, `group_members`, `expenses`, `expense_splits`, `settlements`, `profiles`, `notifications`, `personal_expenses`, `monthly_budgets`) has RLS enabled with policies enforcing membership and ownership checks.
- **Iterative RLS hardening** — The migration history shows multiple rounds of RLS refinement to eliminate infinite-recursion issues with self-referencing policy checks on `group_members`.
- **Auto-pending personal expenses** — When a group expense is created, personal expense entries are automatically generated for each split participant, bridging group and personal tracking.
- **Real-time notifications** — Uses Supabase Realtime to subscribe to `INSERT` events on the `notifications` table, delivering instant in-app updates.
- **Server-side AI isolation** — The Gemini API key is only referenced in the server-side API route (`app/api/scan-receipt/route.js`). Client-facing error messages are sanitized to prevent leaking provider details.
- **RLS smoke testing** — An automated test script (`scripts/rls-smoke-test.mjs`) verifies that non-members cannot read groups or insert expenses, and that users cannot spoof `paid_by` fields.

## Database & Security

**Database:** PostgreSQL hosted on Supabase, with 8 user-data tables and a structured migration history (22 migration files).

**Authentication:** Supabase Auth handles signup, login, and session management. Users are identified by UUID. A `profiles` table stores usernames and email addresses, linked to `auth.users`.

**Row-Level Security (RLS):** Every table has RLS enabled. Policies enforce:
- Users can only read groups they are members of
- Expenses can only be created by authenticated group members
- Users cannot spoof the `paid_by` field on expenses
- Personal expenses and budgets are scoped to the owning user
- Notifications are scoped to the target user
- Settlements are scoped to group membership

**Environment variables:** Secrets are loaded from `.env.local` (gitignored). The Supabase client throws immediately if required variables are missing, preventing silent failures with placeholder credentials.

## Project Structure

```
splitsync-app/
├── app/                          # Next.js App Router pages
│   ├── api/scan-receipt/         # Server-side Gemini receipt scanning
│   ├── dashboard/                # Main dashboard, analytics, expenses
│   ├── groups/[groupId]/         # Group detail page (dynamic route)
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── layout.js                 # Root layout (nav, FAB, transitions)
│   ├── manifest.js               # PWA web app manifest
│   └── page.js                   # Landing page
├── components/                   # Reusable UI components
│   ├── BottomSheet.jsx           # Mobile bottom sheet
│   ├── FloatingActionButton.jsx  # Quick-action FAB
│   ├── ItemAssignmentModal.jsx   # Receipt item assignment
│   ├── MobileBottomNav.jsx       # Bottom navigation bar
│   ├── NotificationBell.jsx      # Real-time notification bell
│   ├── PremiumAddExpenseModal.jsx # Expense creation modal
│   ├── PremiumBalancesScreen.jsx  # Balance/settlement view
│   ├── PremiumDashboard.jsx      # Dashboard card layout
│   ├── ReceiptScannerModal.jsx   # AI receipt scanning UI
│   └── SwipeableExpenseItem.jsx  # Swipe-to-delete expense item
├── services/                     # Data-access layer
│   ├── analyticsService.js       # Expense analytics and category inference
│   ├── authService.js            # Authentication (signup, login, logout)
│   ├── budgetService.js          # Monthly budget CRUD
│   ├── expenseService.js         # Expense CRUD, balance calc, debt simplification
│   ├── groupService.js           # Group CRUD, member management
│   ├── notificationService.js    # Notification send/subscribe/mark-read
│   ├── personalExpenseService.js # Personal expense CRUD and stats
│   ├── settlementService.js      # Settlement creation and retrieval
│   └── splitService.js           # Expense split row creation
├── lib/                          # Shared utilities
│   ├── supabaseClient.js         # Supabase client initialization
│   ├── useGroups.js              # Custom hook for group state
│   └── motion.js                 # Framer Motion animation presets
├── supabase/                     # Database configuration
│   ├── config.toml               # Local Supabase config
│   └── migrations/               # 22 SQL migration files
├── scripts/                      # Tooling
│   └── rls-smoke-test.mjs        # Automated RLS verification script
├── public/                       # Static assets (icons, logos)
├── .env.example                  # Required environment variables
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
├── next.config.mjs               # Next.js configuration
├── eslint.config.mjs             # ESLint configuration
└── postcss.config.mjs            # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project with the migrations applied
- A [Google Gemini API key](https://ai.google.dev/) (for receipt scanning)

### Installation

```bash
# Clone the repository
git clone https://github.com/krishika08/splitsync-app.git
cd splitsync-app

# Install dependencies
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) key |
| `GEMINI_API_KEY` | Google Gemini API key (server-side only) |

> **Note:** The `NEXT_PUBLIC_` prefix makes a variable available in the browser. `GEMINI_API_KEY` intentionally lacks this prefix — it is only accessible in server-side API routes.

### Database Setup

Apply the Supabase migrations to your project. The migrations are located in `supabase/migrations/` and should be run in order via the Supabase CLI or SQL Editor.

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Development

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run rls:smoke` | Run RLS smoke tests (requires test user env vars) |

## Roadmap

The following are planned improvements, not yet implemented:

- [ ] OAuth providers (Google, GitHub) via Supabase Auth
- [ ] Push notifications (Web Push API)
- [ ] Recurring expense automation
- [ ] Expense attachments and receipt image storage
- [ ] Export data (CSV/PDF)
- [ ] Currency conversion for multi-currency groups
- [ ] Group invite links

## License

No license file is currently included in this repository. All rights reserved by the author unless otherwise specified.
