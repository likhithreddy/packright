# AI Mastery: Documentation & Strategies

This document outlines the AI modalities and prompt engineering strategies utilized during the development of PackRight.

## 1. AI Modalities: When & Why

During development, two primary AI modalities were leveraged to maximize efficiency, architectural alignment, and design fidelity.

### Modality 1: Claude Web (Claude Sonnet 4.6 and Opus 4.6)

**Usage Scenarios:**

- **Initial Brainstorming & PRD Drafting**: High-level system design, defining user personas, and outlining the core feature set.
- **Iterative Development & UI Mockups**: Generating high-fidelity UI mockups and design concepts based on hand-drawn images provided by us.
- **Large Context Architectural Research**: Pasting large swaths of documentation or multiple files to get a "global" perspective on architectural shifts and design patterns.

**Why:** Using Claude Web (Sonnet 4.6 and Opus 4.6) provides massive context windows and superior creative reasoning for non-code tasks, abstract system design, and visual-to-code translation.

### Modality 2: IDE-Centric AI (Antigravity)

**Usage Scenarios:**

- **Initial Application Build**: Setting up the project structure and starting the core development of the application.
- **In-Line Code Generation**: Generating React components (e.g., `TripCard`) based on existing design system tokens and types.
- **Refactoring & Linting Fixes**: Addressing TypeScript errors and formatting inconsistencies in real-time.
- **Boilerplate Suppression**: Quickly generating repetitive code like Zod schemas or basic UI skeletons.

- **Knowledge Integration (project-memory)**: Leveraging the `project-memory/` directory (containing PRDs, mockups, and research notes) to provide the AI with persistent context. This was highly effective for maintaining architectural consistency and ensuring the implementation strictly followed the product vision.
- **Modular Rule Management (.agent/rules)**: Breaking down the monolithic rules file into modular, specialized files within `.agent/rules/` (e.g., `DESIGN_AND_PRODUCT.md`, `SECURITY_AND_PRACTICES.md`). This allowed for a cleaner separation of concerns and more precise grounding for the AI during specific development tasks.

**Why:** IDE-centric tools provide immediate, file-specific context. By combining this with structured knowledge from `project-memory` and modular rules, the development process became significantly more robust, reducing context-switching and ensuring high-fidelity implementation.

---

## 2. Prompt Engineering Strategies

The following techniques were consistently applied to ensure high-quality, secure, and performant code.

### Role Prompting (Persona)

Instead of generic requests, prompts specified the persona: _"Act as a Senior Full-Stack Engineer specializing in Next.js 14 and Supabase Security."_ This ensured the AI adhered to RLS policies and App Router conventions without reminders.

### Chain of Thought (CoT)

For complex logic (e.g., the group readiness percentage calculation), the AI was instructed to _"Think step-by-step through the database query and math before providing the implementation."_ This reduced logic errors in edge cases (e.g., empty item lists).

### Constraint-Based Prompting

Following the strict project rules, prompts frequently included constraints:

- _"Do not use emojis."_
- _"Use only lucide-react icons."_
- _"Zero tolerance for 'any' types."_
- _"Ensure focus-visible:ring-0 on all inputs."_

### Few-Shot Prompting

When generating new components, existing high-quality components were provided as context: _"Follow the pattern of [MemberModal.tsx] to create the [TripSettingsModal.tsx], using the same framer-motion transitions and Shadcn components."_

---

## 3. Real-World Example: Kanban Board Implementation

**The Challenge:** Implementing a `dnd-kit` sortable context that handles both intra-column reordering and inter-column moves.

**The Strategy:**

1. **Brainstorming (Claude Web)**: Discussed the data structure (Zustand store vs. local state) for optimal performance.
2. **Implementation (IDE AI)**: Used few-shot prompting to map the `dnd-kit` primitives to the existing `Card` and `Badge` components.
3. **Verification**: Drafted Playwright E2E tests using IDE-centric AI to simulate drag-and-drop gestures across viewports.
