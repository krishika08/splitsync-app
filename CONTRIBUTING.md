# Contributing to SplitSync

First off, thank you for considering contributing to SplitSync! It's people like you that make SplitSync such a great tool for splitting expenses.

## Contribution Overview

We welcome contributions of all kinds, including:
- Bug reports and fixes
- Feature requests and implementations
- Documentation improvements
- UI/UX enhancements

Please read through this guide to ensure a smooth contribution process.

## Fork and Clone Instructions

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/splitsync-app.git
   cd splitsync-app
   ```
3. Add the original repository as an upstream remote to keep your fork synced:
   ```bash
   git remote add upstream https://github.com/krishika08/splitsync-app.git
   ```

## Local Setup

Ensure you have Node.js 18+ installed on your machine.

1. Install dependencies:
   ```bash
   npm install
   ```

## Environment Setup

SplitSync requires Supabase and Google Gemini for full functionality.

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and configure your credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous (public) key
   - `GEMINI_API_KEY`: Your Google Gemini API key (server-side only)

3. Database Setup:
   - Apply the migrations found in the `supabase/migrations/` folder to your Supabase project using the Supabase CLI or SQL Editor.

## Development Workflow

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing the page by modifying the `app/` and `components/` directories. The page auto-updates as you edit the file.

## Branch Naming

Please use descriptive branch names. We recommend the following format:
- `feature/short-description` for new features
- `fix/short-description` for bug fixes
- `docs/short-description` for documentation updates
- `chore/short-description` for maintenance tasks

## Commit Conventions

We encourage the use of [Conventional Commits](https://www.conventionalcommits.org/). A good commit message looks like this:
```
<type>(<scope>): <subject>

<body>
```
**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Pull Request Process

1. Ensure your code passes all linting and testing requirements.
2. Update the README.md with details of changes to the interface, if applicable.
3. Push your branch to your fork on GitHub.
4. Open a Pull Request against the `main` branch of the original repository.
5. Provide a clear and descriptive title and description for your PR.

## Code Quality Expectations

- **Service-Layer Architecture**: All data access should live in the `services/` directory. UI components should never call Supabase directly.
- **Client/Server Separation**: Keep Gemini API interactions server-side (e.g., `app/api/scan-receipt/route.js`).
- **Styling**: Use Tailwind CSS 4 for all styling. Maintain consistency with the existing premium design.

## Testing/Linting Expectations

Before submitting a PR, make sure to run the following checks:

1. Run the linter to ensure code style consistency:
   ```bash
   npm run lint
   ```
2. Run the Row-Level Security (RLS) smoke tests to verify database security policies:
   ```bash
   npm run rls:smoke
   ```

## Issue Reporting

When reporting an issue, please include:
- A clear and descriptive title.
- Steps to reproduce the issue.
- Expected versus actual behavior.
- Environment details (browser, OS).
- Screenshots or logs if applicable.
