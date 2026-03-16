# PackRight Development Guide

This guide provides comprehensive instructions for setting up a local development environment, understanding the development workflow, and performing common development tasks for the PackRight project.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Development Workflow](#development-workflow)
5. [Testing Guide](#testing-guide)
6. [Common Tasks](#common-tasks)
7. [Debugging](#debugging)
8. [Project Structure](#project-structure)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the PackRight development environment, ensure you have the following installed:

### Required Software

| Software                    | Minimum Version | Recommended | Installation Link                       |
| --------------------------- | --------------- | ----------- | --------------------------------------- |
| **Node.js**                 | 18.0.0          | 20.x LTS    | https://nodejs.org/                     |
| **Yarn**                    | 1.22.0          | Latest      | `npm install -g yarn`                   |
| **Git**                     | 2.30.0          | Latest      | https://git-scm.com/                    |
| **Supabase CLI** (Optional) | Latest          | Latest      | https://supabase.com/docs/reference/cli |

### Optional Tools

| Software              | Purpose                         | Installation Link                    |
| --------------------- | ------------------------------- | ------------------------------------ |
| **VS Code**           | Recommended IDE                 | https://code.visualstudio.com/       |
| **Docker**            | For testcontainers in E2E tests | https://www.docker.com/              |
| **PostgreSQL Client** | For direct DB access            | https://www.postgresql.org/download/ |

### Account Requirements

- **Supabase Account:** Free account at https://supabase.com
- **GroqAPI Key:** Free API key at https://groq.com
- **GitHub Account:** For repository access and CI/CD

---

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/likhithreddy/packright.git
cd packright

# Verify you're on the main branch
git branch
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
yarn install

# Verify installation
yarn --version
node --version
```

**Expected Output:**

```
Yarn version: 1.22.19+
Node version: v18.0.0+
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your credentials
# See Environment Configuration section below
```

### Step 4: Run Database Migrations

**Option A: Via Supabase Dashboard (Recommended for first-time setup)**

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run each migration file in order from `supabase/migrations/`

**Option B: Via Supabase CLI**

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_ID

# Apply all migrations
supabase db push

# Or run individual migrations
supabase db execute --file supabase/migrations/20260309235500_create_profiles_table.sql
```

### Step 5: Start the Development Server

```bash
# Start the development server
yarn dev

# The application will be available at http://localhost:3000
```

**Expected Output:**

```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
info  - Loaded env from .env.local
event - compiled client and server successfully in 1234 ms (156 modules)
```

### Step 6: Verify Installation

1. Open http://localhost:3000 in your browser
2. You should see the PackRight landing page
3. Test the signup flow with a test account

---

## Environment Configuration

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# GroqAPI Configuration
GROQ_API_KEY=your-groq-api-key-here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Override for different environments
# NODE_ENV=development
```

### Getting Your Credentials

**Supabase Credentials:**

1. Navigate to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

**GroqAPI Key:**

1. Navigate to https://console.groq.com
2. Go to API Keys
3. Create a new API key
4. Copy the key → `GROQ_API_KEY`

### Environment-Specific Files

| File              | Purpose           | Git Status |
| ----------------- | ----------------- | ---------- |
| `.env.local`      | Local development | Ignored    |
| `.env.test`       | Test environment  | Ignored    |
| `.env.production` | Production build  | Ignored    |
| `.env.example`    | Template file     | Tracked    |

---

## Development Workflow

### Branch Strategy

PackRight follows a simplified Git workflow:

```
main (production)
  ├── feature/<issue-number>-description
  ├── bug/<issue-number>-description
  └── chore/<issue-number>-description
```

**Branch Naming Conventions:**

- `feature/61-final-documentation` - New feature development
- `bug/42-fix-drag-drop` - Bug fixes
- `chore/15-update-dependencies` - Maintenance tasks

### Creating a Feature Branch

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/61-final-documentation

# Verify branch
git branch
```

### Pre-Commit Quality Checks

Before committing code, run the mandatory quality checks. See [CI/CD Documentation](./CI_CD.md#pre-commit-checks) for complete details.

**Quick Check:**

```bash
# Run all pre-commit checks
yarn lint && yarn format && yarn test --coverage && yarn test:integration
```

For detailed information about CI/CD pipeline, pre-commit requirements, and troubleshooting, see the [CI/CD Documentation](./CI_CD.md).

### Commit Format

Follow the conventional commit format:

```
[#<issue-number>] <type>: <description>

Types: feat, fix, docs, style, refactor, test, chore

Examples:
[#61] feat: add evaluation dashboard documentation
[#42] fix: resolve drag drop conflict on mobile
[#15] chore: update dependencies to latest versions
```

### Committing Changes

```bash
# Stage changes
git add .

# Commit with formatted message
git commit -m "[#61] feat: add evaluation dashboard documentation"

# Push to remote
git push origin feature/61-final-documentation
```

### Creating a Pull Request

1. Navigate to https://github.com/likhithreddy/packright
2. Click "Compare & pull request"
3. Ensure:
   - Base: `main`
   - Compare: `your-branch`
4. Fill in PR template
5. Link issue: "Closes #61"
6. Request review
7. Wait for CI to pass

---

## Testing Guide

### Unit Tests

**Run All Unit Tests:**

```bash
yarn test
```

**Watch Mode (Development):**

```bash
yarn test:watch
```

**With Coverage:**

```bash
yarn test --coverage

# View coverage report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**Run Specific Test File:**

```bash
yarn test lib/utils.test.ts
```

**Run Tests Matching Pattern:**

```bash
yarn test --testNamePattern="should calculate columns"
```

### Integration Tests

**Run All Integration Tests:**

```bash
yarn test:integration
```

**With Coverage:**

```bash
yarn test:integration --coverage
```

**Run Specific Test:**

```bash
yarn test:integration --testNamePattern="member invitation flow"
```

### E2E Tests

**Run with Testcontainers (Isolated):**

```bash
yarn test:e2e
```

**Run Directly (Requires Running Stack):**

```bash
# Start Supabase locally (if using testcontainers, this is automatic)
yarn test:e2e:direct
```

**View HTML Report:**

```bash
yarn test:e2e:show-report
```

**Run Specific E2E Test:**

```bash
yarn test:e2e --grep "Authentication flow"
```

**Run E2E Tests on Specific Browser:**

```bash
yarn test:e2e --project=chromium
yarn test:e2e --project=firefox
yarn test:e2e --project=webkit
```

### Test Best Practices

1. **Write Tests First:** Follow TDD - write the test, then implement
2. **Test Isolation:** Each test should be independent
3. **Descriptive Names:** Test names should describe what is being tested
4. **Arrange-Act-Assert:** Structure tests clearly
5. **Mock External Dependencies:** Use mocks for external APIs
6. **Test Edge Cases:** Don't just test the happy path

---

## Common Tasks

### Adding a New Component

**Step 1: Write the Test**

```typescript
// src/components/features/my-component.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from './my-component'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

**Step 2: Implement the Component**

```typescript
// src/components/features/my-component.tsx
export function MyComponent() {
  return <div>Hello World</div>
}
```

**Step 3: Ensure Coverage**

```bash
yarn test --coverage --collectCoverageFrom='src/components/features/my-component.tsx'
```

**Step 4: Update Documentation (if needed)**

### Adding a New Database Table

**Step 1: Create Migration**

```bash
# Create new migration file
touch supabase/migrations/YYYYMMDDHHMMSS_issue_number_description.sql
```

**Step 2: Write Migration SQL**

```sql
-- Example: Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO public
  USING (is_member_of(trip_id));

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT TO public
  WITH CHECK (is_admin_of(trip_id));
```

**Step 3: Apply Migration**

```bash
# Via Supabase CLI
supabase db push

# Or via Dashboard
# Run migration in SQL Editor
```

**Step 4: Update TypeScript Types**

```bash
# Generate types from database
supabase gen types typescript --local > src/types/database.types.ts
```

**Step 5: Write Database Query Functions**

```typescript
// src/lib/supabase/categories.ts
import { Database } from '@/types/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

export async function getCategories(supabase: SupabaseClient, tripId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order');

  if (error) throw error;
  return data;
}
```

**Step 6: Write Tests**

```typescript
// tests/unit/lib/supabase/categories.test.ts
import { getCategories } from '@/lib/supabase/categories';

describe('getCategories', () => {
  it('should return categories for a trip', async () => {
    // Test implementation
  });
});
```

### Debugging Realtime Issues

**Step 1: Check Subscription**

```typescript
// Add logging to subscription
console.log('Subscribing to trip:', tripId)

const channel = supabase.channel(`trip:${tripId}`)
  .on('postgres_changes', { ... }, (payload) => {
    console.log('Realtime event:', payload)
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })
```

**Step 2: Check Supabase Dashboard**

1. Go to Supabase Dashboard → Realtime
2. Check active connections
3. Monitor broadcast events

**Step 3: Verify RLS Policies**

```sql
-- Check if user can access the trip
SELECT is_member_of('trip-id-here');
```

### Performance Profiling

**Step 1: Enable React DevTools Profiler**

1. Install React DevTools browser extension
2. Enable Profiler tab
3. Record interactions
4. Analyze component render times

**Step 2: Check Bundle Size**

```bash
# Analyze bundle
yarn build

# Check output for bundle sizes
# Page          Size        First Load JS
# ┌ ○ /         5.2 kB          87.5 kB
```

**Step 3: Profile Database Queries**

```typescript
// Add timing to queries
console.time('getItems');
const { data } = await supabase.from('items').select('*');
console.timeEnd('getItems');
```

---

## Debugging

### Common Issues and Solutions

#### Issue: "Module not found: Can't resolve '@/lib/...'"

**Solution:**

```bash
# Restart the dev server
yarn dev
```

#### Issue: "Supabase error: Permission denied"

**Solution:**

```sql
-- Check RLS policies are enabled
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Check if user is a trip member
SELECT * FROM trip_members WHERE trip_id = 'your-trip-id' AND user_id = auth.uid();
```

#### Issue: "Realtime updates not working"

**Solution:**

```typescript
// Verify realtime is enabled for the table
// 1. Go to Supabase Dashboard → Database → Replication
// 2. Ensure tables are added to Realtime publication

// Check subscription status
channel.on('system', {}, (payload) => {
  console.log('System event:', payload);
});
```

#### Issue: "Tests failing with 'Cannot find module'"

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules yarn.lock
yarn install
```

#### Issue: "TypeScript errors after generating types"

**Solution:**

```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or restart dev server
yarn dev
```

### Debug Mode

**Enable Verbose Logging:**

```typescript
// In development, add this to your app
if (process.env.NODE_ENV === 'development') {
  window.DEBUG = true;
}
```

**Use Browser DevTools:**

1. Open DevTools (F12)
2. Go to Console tab
3. Filter by PackRight logs
4. Use debugger statements in code

---

## Project Structure

### Directory Tree

```
packright/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD pipeline
│
├── docs/                          # Documentation
│   ├── AI_MASTERY.md              # AI usage documentation
│   ├── API_DOCS.md                # API reference
│   ├── ARCHITECTURE.md            # System architecture
│   ├── DEVELOPMENT.md             # This file
│   ├── EVALUATION_DASHBOARD.md    # Test results and metrics
│   └── SPRINTS.md                 # Sprint documentation
│
├── public/                        # Static assets
│   └── fonts/                     # Custom fonts
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/               # Auth route group
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/          # Protected routes
│   │   │   ├── dashboard/
│   │   │   └── trip/[id]/
│   │   ├── api/                  # API routes
│   │   │   └── generate-list/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                   # Base Shadcn UI components
│   │   ├── layout/               # Layout components
│   │   └── features/             # Domain-specific components
│   │
│   ├── lib/
│   │   ├── supabase/             # Supabase client and queries
│   │   └── utils.ts              # General utilities
│   │
│   ├── store/
│   │   └── board-store.ts        # Zustand board state
│   │
│   └── types/
│       ├── board.types.ts        # Board-related types
│       └── database.types.ts     # Database-generated types
│
├── supabase/
│   └── migrations/               # Database migrations
│
├── tests/
│   ├── e2e/                      # Playwright E2E tests
│   ├── integration/              # Integration tests
│   └── unit/                     # Unit tests
│
├── .env.example                  # Environment template
├── .eslintrc.json               # ESLint configuration
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── vercel.json                  # Vercel deployment config
```

### File Purposes

| Location                   | Purpose                              |
| -------------------------- | ------------------------------------ |
| `src/app/`                 | Next.js App Router pages and layouts |
| `src/components/ui/`       | Reusable UI components (Shadcn)      |
| `src/components/features/` | Business logic components            |
| `src/lib/supabase/`        | Supabase client and database queries |
| `src/store/`               | Zustand state management             |
| `src/types/`               | TypeScript type definitions          |
| `tests/`                   | All test files                       |
| `supabase/migrations/`     | Database schema changes              |
| `docs/`                    | Project documentation                |

---

## Troubleshooting

### Development Server Issues

**Server won't start:**

```bash
# Check port is not in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Or use different port
yarn dev --port 3001
```

**Hot reload not working:**

```bash
# Clear .next cache
rm -rf .next

# Restart dev server
yarn dev
```

### Database Issues

**Connection refused:**

- Check Supabase project is active
- Verify credentials in `.env.local`
- Check network connectivity

**RLS policy blocking access:**

- Verify user is a trip member
- Check RLS policy logic in Supabase Dashboard
- Test with `service_role` key to bypass RLS temporarily

### Test Failures

**Flaky E2E tests:**

- Increase timeout in test configuration
- Check for race conditions in test logic
- Ensure proper cleanup between tests

**Coverage dropped below 80%:**

- Identify uncovered lines in coverage report
- Add tests for uncovered code paths
- Ensure new code is tested

### Build Issues

**Production build fails:**

```bash
# Check for unused dependencies
npx depcheck

# Clean build artifacts
rm -rf .next out

# Try build again (TypeScript errors will be caught during build)
yarn build
```

---

## Additional Resources

### Official Documentation

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **GroqAPI:** https://groq.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Framer Motion:** https://www.framer.com/motion/
- **dnd-kit:** https://docs.dndkit.com
- **Zustand:** https://zustand-demo.pmnd.rs
- **Jest:** https://jestjs.io/docs/getting-started
- **Playwright:** https://playwright.dev/docs/intro

### Internal Documentation

- [Sprint Documentation](./SPRINTS.md)
- [API Documentation](./API_DOCS.md)
- [Architecture](./ARCHITECTURE.md)
- [Evaluation Dashboard](./EVALUATION_DASHBOARD.md)
- [CI/CD Pipeline](./CI_CD.md)
- [AI Mastery](./AI_MASTERY.md)

### Community & Support

- **GitHub Issues:** https://github.com/likhithreddy/packright/issues
- **Supabase Discord:** https://discord.gg/supabase
- **Next.js Discord:** https://discord.gg/nextjs

---

**Last Updated:** March 15, 2026
