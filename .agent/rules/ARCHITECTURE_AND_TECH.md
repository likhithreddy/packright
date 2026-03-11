---
trigger: always_on
---

# PackRight Architecture & Tech Stack Rules

**[CRITICAL AI COMMUNICATION DIRECTIVE]**

```markdown
When communicating with the developer outside of generating designated reports or code blocks or generating commit messages, the AI must prefix _all_ conversational responses with the phrase `[ARCHITECTURE AND TECH RULE ACKNOWLEDGED]` and start actual response from next line.
```

## 1. Project Context & Comprehensive Architecture

### Tech Stack (Strict Versions)

- **Core**: Next.js 14+ (App Router), React 18+, TypeScript (Strict Mode).
- **Styling & UI**: Tailwind CSS v3+, `framer-motion` (for fluid/spring UI animations), Shadcn UI (Base elements).
- **Backend & Auth**: Supabase (PostgreSQL, Realtime subscriptions, Auth for Email/OAuth).
- **AI Integration**: GroqAPI (Executed exclusively within Server-side Next.js API Routes).
- **State Management**: Zustand (Client-side state, specifically for drag-and-drop board state).
- **Drag and Drop**: `dnd-kit` (Kanban Board implementation).
- **Forms & Validation**: `react-hook-form` paired strictly with `zod`.
- **Date & Icons**: `date-fns` for date manipulation; `lucide-react` for all iconography.
- **Hosting & Deployment**: **Vercel** exclusively. We use seamless Vercel integrations for continuous deployment from the GitHub `main` branch.

### Architecture Overview & Folder Structure

PackRight follows a highly organized Next.js App Router structure. Separating server-side logic from client-side interactivity is paramount.

**Strict Rule:** **NEVER** create separate new folders or files for new implementations directly without understanding this existing structure. **ALWAYS** map new functionality to this precise directory tree:

```text
/
  ├── vercel.json           # Vercel deployment configuration (serverless limits, headers)
  ├── next.config.mjs       # Next.js configurations
  ├── src/
  │    ├── app/             # Next.js App Router: Pages, Layouts, Server API Routes
  │    │    ├── (auth)/     # Route groups for logical separation
  │    │    ├── api/        # Secure serverless functions (GroqAPI integration)
  │    │    └── dashboard/  # Protected application pages
  │    ├── components/
  │    │    ├── ui/         # Base Shadcn UI components ONLY (buttons, inputs, cards)
  │    │    ├── layout/     # Top-level layout elements (Navbar, Sidebar)
  │    │    └── features/   # Complex, domain-specific components
  │    ├── lib/             # Utility functions and external integrations
  │    │    ├── supabase/   # Supabase client instantiation and DB query helpers
  │    │    └── utils.ts    # General utilities (e.g., tailwind `cn` merger)
  │    ├── store/           # Zustand client-side state stores
  │    └── types/           # Global TypeScript definitions & Zod schemas
  └── tests/                # E2E Playwright and Vitest root setup
```

### Naming Conventions & Coding Standards

- **File & Directory Names**: `kebab-case` strictly (e.g., `member-invite-modal.tsx`, `auth-utils.ts`).
- **React Components**: `PascalCase` strictly (e.g., `TripBoard`, `NewTripModal`).
- **Strict Typing & Linting (Zero Tolerance)**: The project operates under strict TypeScript mode. There must be **zero** TypeScript compilation errors and **zero** ESLint or Prettier formatting errors at any given time. Code containing `any` types, unused imports, or formatting warnings must not be committed.

### Testing Strategy

**Methodology:** Test-Driven Development (TDD) is required. Ensure minimum **80% test code coverage** across the project.

- **Test Integrity Constraint (Strict Rule):** Test cases must always verify the _intended_ or _ideal_ behavior. You must **never** blindly update test cases to match a broken or incorrect implementation. If the current implementation does not follow the intended behavior, you must change the implementation to fix it, do not change the test. **Additionally, you must NEVER delete existing test cases; always fix or update them to ensure continuous coverage and regression testing.**
- **Feature Implementation Checkpoint**: For every feature requested via a GitHub issue, you must evaluate the acceptance criteria and proactively generate as many robust test cases as possible using **Jest** (not Vitest). Implementation cannot be marked as "completed" until all generated Jest test cases successfully pass.
- **Unit Tests (Jest)**: Used for isolated business logic, database query wrappers, and utility functions (e.g., testing the Group Readiness percentage calculation). All files must end in `.test.ts` or `.test.tsx` and reside in `/tests/unit/`.
- **Integration Tests (Jest)**: Used for evaluating connected React Components spanning multiple features or simulating back-end interaction via mocked APIs (e.g., MSW). All files must end in `.test.tsx` or `.test.ts` and reside in `/tests/integration/`.
- **E2E Tests (Playwright)**: Used to validate critical user flows (e.g., Logging in, creating a trip, utilizing the drag-and-drop board). All files must reside in the `/tests/e2e/` root directory.
- **CI Blocker**: Every Pull Request must pass the automated GitHub Actions pipeline. The PR **cannot be merged** if unit tests fail, integration tests fail, E2E tests fail, or aggregate code coverage drops below 80%.

### Mandatory Pre-Commit Checks

To ensure code quality and prevent CI failures, the following must be run and passed before EVERY commit:
1. `yarn lint`: Zero ESLint errors or warnings.
2. `yarn format`: Strict Prettier compliance.
3. `yarn test --coverage`: Unit tests with 80%+ coverage.
4. `yarn test:integration`: All integration tests pass.
5. `yarn test:e2e`: All Playwright E2E flows pass across all browsers.
