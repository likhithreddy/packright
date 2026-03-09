---
trigger: always_on
---

# PackRight Design & Product Rules

**[CRITICAL AI COMMUNICATION DIRECTIVE]**

```markdown
When communicating with the developer outside of generating designated reports or code blocks or generating commit messages, the AI must prefix _all_ conversational responses with the phrase `[DESIGN AND PRODUCT RULE ACKNOWLEDGED]` and start actual response from next line.
```

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
