---
trigger: always_on
---

# PackRight AI Coding Rules

**[CRITICAL AI COMMUNICATION DIRECTIVE]**

```markdown
When communicating with the developer outside of generating designated reports or code blocks or generating commit messages, the AI must prefix _all_ conversational responses with the phrase `[RULES_ACKNOWLEDGED]` and start actual response from next line.
```

This rules document is the ultimate source of truth for all PackRight development. It dictates the architecture, tech stack, testing strategy, UI/UX behavior, and scrum workflow. **Do not deviate from these rules under any circumstances.**

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

- **Feature Implementation Checkpoint**: For every feature requested via a GitHub issue, you must evaluate the acceptance criteria and proactively generate as many robust test cases as possible using **Jest** (not Vitest). Implementation cannot be marked as "completed" until all generated Jest test cases successfully pass.
- **Unit Tests (Jest)**: Used for isolated business logic, database query wrappers, and utility functions (e.g., testing the Group Readiness percentage calculation). All files must end in `.test.ts` or `.test.tsx` and reside in `/tests/unit/`.
- **Integration Tests (Jest)**: Used for evaluating connected React Components spanning multiple features or simulating back-end interaction via mocked APIs (e.g., MSW). All files must end in `.test.tsx` or `.test.ts` and reside in `/tests/integration/`.
- **E2E Tests (Playwright)**: Used to validate critical user flows (e.g., Logging in, creating a trip, utilizing the drag-and-drop board). All files must reside in the `/tests/e2e/` root directory.
- **CI Blocker**: Every Pull Request must pass the automated GitHub Actions pipeline. The PR **cannot be merged** if unit tests fail, integration tests fail, E2E tests fail, or aggregate code coverage drops below 80%.

---

## 2. PRD, Design Specs & User Flows

**Links:**

- Product Requirements: `project-memory/prd.md`
- Tasks: `project-memory/github_issues.md`

### Visual Identity & Mockup Implementation Details

- **Typography Pair**: **DM Serif Display** (for elegant headings and titles) + **Figtree** (for clean, readable body text).
- **Color Palette**: Premium earthy/organic tones — warm browns, forest greens, and soft beiges.
- **Micro-interactions & UX**: Implement fluid, spring-physics animations using `framer-motion`. Elements like modals, dropdowns, and drag-and-drop operations should transition smoothly. **Rule:** Do _not_ overdo animations or add superfluous front-end elements. The transitions should feel natural and minimal, not distracting.

### Key UI Components & Expected Behaviors

- **The Packing Board**: This is the core interface. It must look and behave precisely like a **GitHub Kanban board**.
  - _Behavior_: Users must be able to drag-and-drop items freely between columns (Needed -> Claimed -> Packed) to alter their status. Crucially, users must _also_ be able to reorder items vertically _within the same column_.
  - _Tech_: Built using `dnd-kit` for the drag physics, nested inside `Shadcn` layout cards, managed by `Zustand`.
- **Modals**: E.g., The "New Trip" modal. Built using Shadcn Dialog components, enhanced with `framer-motion` for smooth, snappy entry/exit transitions.

### User Flow Descriptions (AI Implementation Guide)

When building new features, ensure they respect the logical flow of the PRD. Example flows include:

1. **Trip Creation**: User opens modal -> Inputs trip description (`react-hook-form` + `zod`) -> Submits -> Next.js API Route passes description to GroqAPI -> GroqAPI returns structured JSON array -> Items are batch-inserted into Supabase database via Prisma/Supabase client -> Modal closes smoothly (`framer-motion`) and UI updates.
2. **Claiming/Packing Flow (Real-time)**: User clicks/drags an item in the "Needed" column -> Client-side state updates instantly for immediate visual feedback (`Zustand`) -> Database mutation fires -> Supabase Realtime channel broadcasts change -> Component calculates new UI state based on exact database truth.

---

## 3. Scrum, Workflow & PR Instructions

We strictly adhere to Agile Scrum methodology. **Do not deviate from this workflow at any cost.**

### Branching & Commits

- **Branch Required**: You must strictly create a new branch for every issue. Never commit directly to `main`.
- **Branch Naming**: `feature/<issue-number>-<short-description>`, `bug/<issue-number>-<description>`, or `chore/<issue-number>-<description>`.
- **AI Branching & PR Protocol**: For _every single issue_ assigned, you must follow this exact sequence:
  1. Prompt the user to create a new branch strictly matching the issue label (e.g., `feature/...`, `bug/...`, `chore/...`) and branch naming convention.
  2. Wait to ensure checkout to that new branch is successful.
  3. **CRITICAL:** Explicitly remind the user to move the tracking issue to **"In Progress"** on the Kanban board.
  4. Start the implementation phase (incorporating all mandatory Jest test generation and validation).
  5. Once implementation and tests are completely verified and done, prompt to raise a Pull Request to `main`.
  6. **CRITICAL:** Explicitly remind the user to move the tracking issue to **"Review"** on the Kanban board immediately after the Pull Request is raised against `main`.
- **Commit Frequency**: Commit often (e.g., after creating a component, after writing a test) to build a valid history checkpoint. You must explicitly commit the moment an issue implementation is completed in full.
- **Commit Format**: Start the message with the bracketed issue reference. Example: `[#42] feat: implement real-time kanban board`.

### Code Comments & Referencing

- When leaving a TODO related to an active tracking issue, or marking code for a future sprint task, strictly use this format:
  `// ISSUE-#<number>: <description>`.
  _(Example: `// ISSUE-#42: Implement dnd-kit sortable context here`)_

### PR Workflow

- Open the PR against `main`.
- Link the GitHub issue in the PR description to trigger automatic closure upon merge (e.g., `Closes #42`).
- A PR is blocked unless: (a) Automated tests pass, (b) 80% coverage is maintained, (c) Code reviews (if applicable) are approved, and (d) ESLint/Prettier checks pass.

---

## 4. Do's and Don'ts

### Security & Accessibility Rules

- **Highest Security**: Supabase Row-Level Security (RLS) policies are mandatory. Users must strictly only fetch, read, and write data associated with a Trip `id` they are actively a member of.
- **Highest Security**: API keys (`GROQ_API_KEY`, Supabase Service keys) must **never** be exposed to the client. They must exclusively live in server-side API routes or Server Components.
- **Accessibility**: Enforce high standards. Forms must be keyboard-navigable. The `dnd-kit` implementation must include `ARIA` live regions so screen readers announce item drops/moves. All inputs need clear labels.

### Explicit Development Patterns

- **DO** use TDD. Write the test concurrent with the feature.
- **DO** leverage `react-hook-form` and `zod` for all form input/validation to guarantee type safety up to the layout boundary.
- **DO** use `lucide-react` for all icons ensuring a consistent visual weight.
- **DON'T** merge code that fails tests or lowers coverage.
- **DON'T** arbitrarily install alternate dependencies for problems already solved by the mandated stack (e.g., do not install `redux` or `moment.js`; use the mandated `zustand` and `date-fns`).
- **DON'T** place business logic directly inside UI components. Abstract Supabase calls into the `src/lib/supabase/` layer.

---

## 5. AI Assistant Persona Constraints

- **Absolute Truthfulness**: The Assistant must index strictly on empirical evidence, factual documentation, and provided files. Under no circumstances should the Assistant invent (hallucinate) information, mock APIs, or assume missing architectural specifications. If the Assistant does not know something or lacks sufficient context, it must explicitly halt and inform the developer that it does not know.
- **Developer Pushback**: The Assistant is a technical partner, not a sycophant. The Assistant has full permission and is _expected_ to disagree, say "no", and alert the developer if they are making an architectural mistake, violating these rules, asking for contradictory implementations, or misunderstanding a paradigm. Prioritize objective correctness over pleasing the user.
- **Strict Issue Adherence**: Implement _only_ what is explicitly requested in the assigned issue description and validate _only_ against its stated Acceptance Criteria. While it is acceptable and encouraged to read the PRD and rules to anticipate architectural dependencies, the Assistant must _never_ implement those anticipated future changes prematurely.
