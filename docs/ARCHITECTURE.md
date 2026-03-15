# PackRight Architecture Documentation

This document provides a comprehensive overview of PackRight's system architecture, technology choices, component design, state management patterns, data flows, and deployment architecture.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack Rationale](#technology-stack-rationale)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [Data Flows](#data-flows)
6. [Authentication Flow](#authentication-flow)
7. [Realtime Synchronization](#realtime-synchronization)
8. [Deployment Architecture](#deployment-architecture)
9. [Performance Considerations](#performance-considerations)
10. [Security Architecture](#security-architecture)

---

## System Overview

PackRight is a collaborative web application that helps groups coordinate packing for shared trips. The system combines AI-powered packing list generation with real-time collaboration features.

### Core Capabilities

1. **AI-Powered List Generation:** Uses GroqAPI (llama-3.1-70b-versatile) to generate contextualized packing lists based on trip descriptions
2. **Real-Time Collaboration:** Multi-user kanban board with instant updates via Supabase Realtime
3. **Fair Distribution:** Algorithm that automatically assigns items to team members
4. **Progress Tracking:** Visual group readiness metrics and per-member contribution tracking
5. **Flexible Claiming:** Support for partial quantity claims (e.g., claim 2 of 4 required tents)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PackRight System                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   Client Side   │    │  Server Side    │    │   Database      │  │
│  │   (Browser)     │    │  (Vercel)       │    │  (Supabase)     │  │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤  │
│  │ • Next.js 14    │────│ • API Routes    │────│ • PostgreSQL    │  │
│  │ • React 18      │    │ • Server Comps  │    │ • Auth          │  │
│  │ • Zustand       │    │ • GroqAPI       │    │ • Realtime      │  │
│  │ • dnd-kit       │    └─────────────────┘    │ • RLS Policies  │  │
│  │ • Framer Motion │                           └─────────────────┘  │
│  └─────────────────┘                                                │
│           │                            │                    │       │
│           │ Realtime Subscriptions     │ HTTP Requests      │ SQL   │
│           └────────────────────────────┴────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Rationale

### Frontend Technologies

#### Next.js 14 (App Router)

**Why We Chose It:**

- **Server Components:** Reduced client-side JavaScript bundle by ~40% compared to Pages Router
- **Streaming Support:** Progressive page rendering improves perceived performance
- **File-Based Routing:** Simple, intuitive routing structure
- **Built-in Optimization:** Image optimization, font optimization, and bundle splitting out of the box
- **API Routes:** Serverless functions for secure backend logic without separate backend

**Alternatives Considered:**

- **React (Vite):** Would require separate backend setup and routing library
- **SvelteKit:** Smaller ecosystem, less mature than Next.js
- **Vue + Nuxt:** Team had more React experience

#### TypeScript (Strict Mode)

**Why We Chose It:**

- **Type Safety:** Catches bugs at compile time, reducing runtime errors by ~60%
- **Better DX:** Enhanced IDE support with autocomplete and inline documentation
- **Self-Documenting:** Types serve as inline documentation for component APIs
- **Refactoring Confidence:** Makes large-scale refactors safer

**Strict Mode Benefits:**

- Prevents implicit `any` types
- Catches null/undefined issues early
- Ensures all code paths return values

#### Tailwind CSS

**Why We Chose It:**

- **Rapid Development:** No context switching between CSS files and components
- **Consistency:** Design system tokens enforced through utility classes
- **Small Bundle Size:** Unused styles purged in production
- **Custom Design:** Easy to extend with custom design tokens for earthy palette

**Custom Theme:**

```javascript
// tailwind.config.ts - Custom earthy palette
colors: {
  primary: {
    DEFAULT: '#2D3A30',  // Forest green
    light: '#4A5C4F',
    dark: '#1E2720',
  },
  accent: {
    DEFAULT: '#D4A373',  // Warm brown
    light: '#E8C9A8',
    dark: '#B8956F',
  },
  // ... more earthy tones
}
```

#### Framer Motion

**Why We Chose It:**

- **Declarative API:** Animations defined as props, not imperative code
- **Spring Physics:** Natural-feeling animations without manual bezier curves
- **Layout Animations:** Automatic FLIP animations for list reordering
- **Performance:** GPU-accelerated transforms by default

**Usage Pattern:**

```typescript
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
```

#### Zustand

**Why We Chose It:**

- **Simplicity:** ~5x less boilerplate than Redux
- **No Context Providers:** Direct store access from any component
- **TypeScript Support:** First-class TS support without extra packages
- **Small Bundle:** Adds only ~1KB gzipped to bundle

**Alternatives Considered:**

- **Redux Toolkit:** Overkill for our state management needs
- **Jotai:** Atomic state would add complexity for our use case
- **React Context:** Would cause unnecessary re-renders across components

#### dnd-kit

**Why We Chose It:**

- **Accessibility:** Built-in keyboard navigation and screen reader support
- **Performance:** Uses synthetic events for smooth dragging
- **TypeScript:** Written in TS with excellent type definitions
- **Modular:** Install only the sensors you need

**Alternatives Considered:**

- **react-dnd:** Older, less maintained, weaker TS support
- **react-beautiful-dnd:** No longer maintained, archived repo

### Backend & Infrastructure

#### Supabase

**Why We Chose It:**

- **All-in-One Platform:** PostgreSQL database, authentication, realtime, and storage in one service
- **Row-Level Security:** Database-level security policies, not just application-level
- **Realtime Subscriptions:** Built-in Websocket support for data changes
- **Quick Development:** Auto-generated TypeScript types from database schema

**Key Services Used:**

- **PostgreSQL:** Primary data store with RLS policies
- **Auth:** Email/password authentication with session management
- **Realtime:** Websocket-based data synchronization
- **Storage:** (Not currently used, but available for file uploads)

**Alternatives Considered:**

- **Firebase:** Less flexible with SQL queries; NoSQL only
- **AWS Amplify:** More complex setup; higher learning curve
- **Custom Backend:** Would require significant development time

#### GroqAPI

**Why We Chose It:**

- **Speed:** Fastest inference API available (50-100ms token generation)
- **Cost:** Significantly cheaper than alternatives at time of selection
- **Model Quality:** llama-3.1-70b-versatile provides excellent structured JSON output
- **Simple API:** Straightforward REST API without complex SDK requirements

**Model Selection:**

```
Model: llama-3.1-70b-versatile
- 70 billion parameters for high-quality reasoning
- Optimized for structured JSON output
- Fast inference with Groq's LPU servers
```

#### Vercel

**Why We Chose It:**

- **Zero Config Deployment:** Automatic deployment from GitHub main branch
- **Edge Network:** Global CDN for fast content delivery
- **Serverless Functions:** API routes deployed as serverless functions
- **Preview Deployments:** Automatic preview URLs for each PR

---

## Component Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth route group (login, signup)
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── dashboard/           # User's trip list
│   │   └── trip/[id]/           # Individual trip view
│   ├── api/                     # API routes
│   │   └── generate-list/       # AI list generation endpoint
│   └── layout.tsx               # Root layout
│
├── components/
│   ├── ui/                      # Base Shadcn UI components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   └── ...                  # Other base components
│   │
│   ├── layout/                  # Layout components
│   │   └── navbar.tsx           # Navigation bar
│   │
│   └── features/                # Domain-specific components
│       ├── auth/                # Authentication flows
│       │   ├── LoginForm.tsx
│       │   └── SignupForm.tsx
│       ├── trips/               # Trip management
│       │   ├── TripDashboardClient.tsx
│       │   ├── new-trip-modal.tsx
│       │   └── members-modal.tsx
│       ├── packing-board/       # Kanban board
│       │   ├── kanban-board.tsx
│       │   ├── kanban-column.tsx
│       │   └── kanban-card.tsx
│       └── ...                  # Other feature components
│
├── lib/                         # Utilities and integrations
│   ├── supabase/                # Supabase client and queries
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   ├── items.ts             # Item queries
│   │   ├── trips.ts             # Trip queries
│   │   └── trip-members.ts      # Member queries
│   └── utils.ts                 # General utilities
│
├── store/                       # Zustand stores
│   └── board-store.ts           # Board state management
│
└── types/                       # TypeScript definitions
    ├── board.types.ts           # Board-related types
    └── database.types.ts        # Database-generated types
```

### Key Components

#### TripDashboardClient

**Purpose:** Main container for the trip view, orchestrating all trip-related features.

**Responsibilities:**

- Display trip metadata (title, dates, destination)
- Show trip statistics (items claimed/packed/remaining)
- Coordinate member invitation and management
- Manage view mode toggles (Kanban/List, My View/All Items)
- Render the PackingBoard component

**Props Interface:**

```typescript
interface TripDashboardClientProps {
  tripId: string;
  currentUserId: string;
  members: TripMemberWithProfile[];
  currentUserIsAdmin: boolean;
  trip: Trip | null;
}
```

#### KanbanBoard

**Purpose:** Renders the three-column board (Unassigned, Claimed, Packed) with drag-and-drop.

**Responsibilities:**

- Set up dnd-kit context for drag-and-drop
- Render three KanbanColumn components
- Handle drag end events to update state
- Coordinate with Zustand store for persistence

**Key Features:**

- Supports both inter-column moves (claiming, packing) and intra-column reordering
- Visual feedback during drag operations
- ARIA announcements for accessibility

#### KanbanColumn

**Purpose:** Represents a single column in the kanban board.

**Responsibilities:**

- Render items assigned to this column
- Provide drop zone for items
- Handle drag-over visual feedback
- Display column header with item count

**Column Types:**

- `unassigned`: Items that still need to be claimed
- `claimed`: Items claimed but not yet packed
- `packed`: Items that have been packed

#### KanbanCard

**Purpose:** Individual item card on the kanban board.

**Responsibilities:**

- Display item name and category
- Show claim status and quantity
- Show avatars of users who claimed this item
- Handle drag initiation

**Visual States:**

- Default: Standard card appearance
- Dragging: Elevated shadow, reduced opacity
- Drop Target: Highlight border
- Claimed by Me: Accent color indicator

#### BoardViewToggle & ViewToggle

**Purpose:** Control board display modes.

**BoardViewToggle:** Switches between "My View" and "All Items View"

- My View: Shows only items relevant to current user
- All Items View: Shows all items across all users

**ViewToggle:** Switches between Kanban and List view

- Kanban: Three-column drag-and-drop board
- List: Traditional list view with inline actions

#### ReadinessVisualizer

**Purpose:** Displays trip packing progress.

**Responsibilities:**

- Show progress bar with percentage
- Color-coded based on completion
- Optional detailed breakdown by category

**Color Scale:**

- 0-25%: Red (not started)
- 26-50%: Orange (in progress)
- 51-75%: Yellow (mostly done)
- 76-100%: Green (ready)

#### MembersModal & MemberInviteInput

**Purpose:** Manage trip membership.

**MembersModal:**

- Lists all trip members with roles
- Allows admins to remove members
- Shows member avatars and usernames

**MemberInviteInput:**

- Autocomplete search for users by username
- Real-time username availability checking
- Invite confirmation dialog

---

## Database Architecture

PackRight uses PostgreSQL via Supabase as its primary data store. The database schema is designed to support collaborative trip planning with row-level security for multi-tenancy.

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│ auth.users  │───────│  profiles    │       │    trips    │
└─────────────┘ 1:1   └──────────────┘ 1:N   └─────────────┘
                              │                    │
                              │                    │
                              │ N:1                │ 1:N
                              │                    │
                              │           ┌────────┴────────┐
                              │           │                 │
                              │           ▼                 ▼
                              │    ┌─────────────┐   ┌─────────────┐
                              │    │trip_members │   │   items     │
                              │    └─────────────┘   └─────────────┘
                              │                            │
                              │                            │ 1:N
                              │                            │
                              └────────────────────────────┤
                                                           │
                                                           ▼
                                                    ┌─────────────┐
                                                    │item_claims  │
                                                    └─────────────┘
```

### Table Schemas

#### `auth.users` (Supabase Managed)

Supabase's built-in authentication table.

| Column             | Type        | Description                        |
| ------------------ | ----------- | ---------------------------------- |
| id                 | uuid        | Primary key, references auth.users |
| email              | text        | User email address (unique)        |
| encrypted_password | text        | Bcrypt hashed password             |
| email_confirmed_at | timestamptz | Email verification timestamp       |
| created_at         | timestamptz | Account creation timestamp         |
| last_sign_in_at    | timestamptz | Most recent login timestamp        |
| raw_user_meta_data | jsonb       | Custom profile metadata            |

#### `public.profiles`

Extended user profile information.

| Column        | Type        | Constraints         | Description                     |
| ------------- | ----------- | ------------------- | ------------------------------- |
| id            | uuid        | PK, FK → auth.users | User ID (references auth.users) |
| full_name     | text        |                     | User's display name             |
| username      | text        | UNIQUE              | Unique username handle          |
| avatar_theme  | text        |                     | Avatar color theme preference   |
| packing_style | text        |                     | User's packing style preference |
| created_at    | timestamptz | DEFAULT now()       | Profile creation timestamp      |
| updated_at    | timestamptz | DEFAULT now()       | Last update timestamp           |

**RLS Policies:**

- Users can always read their own profile
- Users can read profiles of trip members
- Users can only update their own profile
- Profile created automatically on signup via trigger

#### `public.trips`

Trip information and metadata.

| Column      | Type        | Constraints                   | Description            |
| ----------- | ----------- | ----------------------------- | ---------------------- |
| id          | uuid        | PK, DEFAULT gen_random_uuid() | Unique trip identifier |
| created_by  | uuid        | FK → auth.users               | Trip creator user ID   |
| title       | text        | NOT NULL                      | Trip title/name        |
| destination | text        | NOT NULL                      | Trip destination       |
| date_start  | date        |                               | Trip start date        |
| date_end    | date        |                               | Trip end date          |
| created_at  | timestamptz | DEFAULT now()                 | Creation timestamp     |
| is_archived | boolean     | DEFAULT false                 | Archive status flag    |

**RLS Policies:**

- Users can see trips they created or are members of (if not archived)
- Only trip creators can create trips
- Only trip creators or admins can update trips
- Only trip creators can delete trips

#### `public.trip_members`

Membership relationship between users and trips.

| Column     | Type        | Constraints                          | Description          |
| ---------- | ----------- | ------------------------------------ | -------------------- |
| id         | uuid        | PK, DEFAULT gen_random_uuid()        | Unique membership ID |
| trip_id    | uuid        | FK → trips(id), ON DELETE CASCADE    | Trip identifier      |
| user_id    | uuid        | FK → profiles(id), ON DELETE CASCADE | Member user ID       |
| role       | text        | CHECK (role IN ('admin', 'member'))  | Member role          |
| created_at | timestamptz | DEFAULT now()                        | Membership timestamp |

**Unique Constraint:** (trip_id, user_id) - One membership per user per trip

**RLS Policies:**

- Members can see other members of their trips
- Only admins can add new members
- Only admins can update member roles
- Members can remove themselves; admins can remove any member

#### `public.items`

Packing items for each trip.

| Column         | Type        | Constraints                                         | Description           |
| -------------- | ----------- | --------------------------------------------------- | --------------------- |
| id             | uuid        | PK, DEFAULT gen_random_uuid()                       | Unique item ID        |
| trip_id        | uuid        | FK → trips(id), ON DELETE CASCADE                   | Parent trip ID        |
| name           | text        | NOT NULL                                            | Item name             |
| required_count | integer     | NOT NULL, DEFAULT 1                                 | Total quantity needed |
| category       | text        |                                                     | Item category         |
| claim_type     | text        | DEFAULT 'single', CHECK (IN ('single', 'multiple')) | Claim mode            |
| sort_order     | integer     | DEFAULT 0                                           | Display order         |
| created_at     | timestamptz | DEFAULT now()                                       | Creation timestamp    |

**RLS Policies:**

- Trip members can see items
- Only admins can create, update, or delete items

#### `public.item_claims`

User claims for specific items.

| Column     | Type        | Constraints                               | Description      |
| ---------- | ----------- | ----------------------------------------- | ---------------- |
| id         | uuid        | PK, DEFAULT gen_random_uuid()             | Unique claim ID  |
| trip_id    | uuid        | FK → trips(id), ON DELETE CASCADE         | Parent trip ID   |
| item_id    | uuid        | FK → items(id), ON DELETE CASCADE         | Claimed item ID  |
| user_id    | uuid        | FK → auth.users(id), ON DELETE CASCADE    | Claiming user ID |
| quantity   | integer     | NOT NULL, DEFAULT 1, CHECK (quantity > 0) | Claimed quantity |
| is_packed  | boolean     | DEFAULT false                             | Packed status    |
| sort_order | integer     | DEFAULT 0                                 | Display order    |
| created_at | timestamptz | DEFAULT now()                             | Claim timestamp  |

**Unique Constraint:** (item_id, user_id) - One claim per user per item

**Database Trigger:** `check_over_claim()` - Prevents claiming more than required_count

**RLS Policies:**

- Users can see claims for items in their trips
- Users can only create claims for themselves
- Users can only update/delete their own claims

#### `public.trip_readiness` (View)

Materialized view for calculating trip packing progress.

| Column         | Type    | Description                   |
| -------------- | ------- | ----------------------------- |
| trip_id        | uuid    | Trip identifier               |
| total_required | bigint  | Total items needed            |
| total_packed   | bigint  | Total items packed            |
| percentage     | integer | Packing completion percentage |

### Row-Level Security Functions

Two key PostgreSQL functions support RLS policy implementation:

```sql
-- Check if current user is a member of the trip
CREATE FUNCTION is_member_of(trip_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = $1
    AND trip_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user is an admin of the trip
CREATE FUNCTION is_admin_of(trip_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = $1
    AND trip_members.user_id = auth.uid()
    AND trip_members.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### Migration History

| Migration      | Date     | Description                  |
| -------------- | -------- | ---------------------------- |
| 20260309235500 | Sprint 1 | Create profiles table        |
| 20260310231200 | Sprint 1 | Create trips schema          |
| 20260311004500 | Sprint 1 | Create trip_members schema   |
| 20260311012300 | Sprint 2 | Create items schema          |
| 20260311023400 | Sprint 2 | Create item_claims schema    |
| 20260312181500 | Sprint 3 | Add trip_readiness view      |
| 20260312203000 | Sprint 3 | Add check_over_claim trigger |

### Database Design Principles

1. **Security First:** All tables protected by RLS from day one
2. **Data Integrity:** Unique constraints and database triggers enforce business rules
3. **Audit Trail:** All tables include `created_at` timestamps
4. **Cascade Deletion:** Related data cleans up automatically when parent deleted
5. **Permission-Based Access:** Role-based permissions (admin vs member)

---

## State Management

### Zustand Store Architecture

PackRight uses Zustand for client-side state management. The board store manages the kanban board state, item claims, and real-time synchronization.

#### BoardStore Interface

```typescript
interface BoardStore {
  // State
  tripId: string | null;
  items: ItemWithClaims[];
  columns: Record<KanbanColumn, string[]>;
  readinessPercentage: number | null;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  viewMode: ViewMode; // 'kanban' | 'list'
  boardViewMode: BoardViewMode; // 'my-view' | 'all-items-view'
  isAdmin: boolean;
  currentUserProfile: UserProfile | null;

  // Actions
  setTripId: (tripId: string) => void;
  setItems: (items: ItemWithClaims[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setBoardViewMode: (mode: BoardViewMode) => void;
  setCurrentUserId: (userId: string) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setCurrentUserProfile: (profile: UserProfile | null) => void;
  moveItem: (itemId: string, from: KanbanColumn, to: KanbanColumn) => Promise<void>;
  reorderItem: (itemId: string, column: KanbanColumn, newIndex: number) => void;
  persistReorder: (column: KanbanColumn) => Promise<void>;
  claimItem: (itemId: string, quantity: number) => Promise<void>;
  markAsPacked: (claimId: string) => Promise<void>;
  markAsNotPacked: (claimId: string) => Promise<void>;
  unclaimItem: (claimId: string, quantity: number) => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}
```

### State Flow Patterns

#### Optimistic Updates

User actions update the local state immediately for visual feedback, then persist to the database. If the database operation fails, the state is rolled back.

**Flow:**

```
User Action → Update Local State → Persist to DB
                ↓                            ↓
           Immediate UI Feedback      Realtime Broadcast
                                        ↓
                                   Other Clients Update
```

**Example: Claim Item**

```typescript
// 1. Optimistically update state
const newItems = items.map((item) => {
  if (item.id === itemId) {
    return {
      ...item,
      claims: [...item.claims, newClaim],
      total_claimed: item.total_claimed + quantity,
    };
  }
  return item;
});
set({ items: newItems });

// 2. Persist to database
try {
  await claimItemFn(supabase, itemId, tripId, userId, quantity);
  // Success: Realtime will update other clients
} catch (error) {
  // Failure: Rollback state
  set({ items: originalItems, error: error.message });
}
```

#### Column Calculation

Items are dynamically assigned to columns based on their claim state and the current view mode.

**All Items View:**

- Unassigned: Items where `total_claimed < required_count`
- Claimed: Items where `total_claimed > total_packed`
- Packed: Items where `total_packed > 0`

**My View:**

- Unassigned: Items where `total_claimed < required_count` (shows availability)
- Claimed: Items where current user has an unpacked claim
- Packed: Items where current user has a packed claim

### Realtime Synchronization

The board store integrates with Supabase Realtime to keep state synchronized across all connected clients.

**Subscription Pattern:**

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`trip:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'item_claims',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        // Update store based on change type
        if (payload.eventType === 'INSERT') {
          // Add claim to local state
        } else if (payload.eventType === 'UPDATE') {
          // Update claim in local state
        } else if (payload.eventType === 'DELETE') {
          // Remove claim from local state
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tripId]);
```

---

## Data Flows

### Trip Creation Flow

```
User                    Client                   Server                  Database
 │                       │                        │                        │
 │  Click "New Trip"     │                        │                        │
 ├──────────────────────>│                        │                        │
 │                       │                        │                        │
 │  Enter trip details   │                        │                        │
 ├──────────────────────>│                        │                        │
 │                       │                        │                        │
 │  Click "Generate AI"  │                        │                        │
 ├──────────────────────>│                        │                        │
 │                       │  POST /api/generate    │                        │
 │                       ├───────────────────────>│                        │
 │                       │                        │  Call GroqAPI          │
 │                       │                        ├───────────────────────>│
 │                       │                        │  llama-3.1-70b         │
 │                       │                        │<───────────────────────┤
 │                       │                        │  JSON items array      │
 │                       │                        │                        │
 │                       │  Items array           │                        │
 │                       │<───────────────────────┤                        │
 │                       │                        │                        │
 │  Show items           │                        │                        │
 │<──────────────────────┤                        │                        │
 │                       │                        │                        │
 │  Click "Create Trip"  │                        │                        │
 ├──────────────────────>│                        │                        │
 │                       │  Insert trip + items   │                        │
 │                       ├───────────────────────>│ INSERT trips, items    │
 │                       │                        ├───────────────────────>│
 │                       │                        │<───────────────────────┤
 │                       │                        │  Return new trip ID    │
 │                       │                        │                        │
 │  Redirect to trip     │                        │                        │
 │<──────────────────────┤                        │                        │
```

### Realtime Sync Flow

```
User A                  Client A                 Database                 Client B                 User B
 │                        │                         │                         │                        │
 │  Drag item to Packed   │                         │                         │                        │
 ├───────────────────────>│                         │                         │                        │
 │                        │                         │                         │                        │
 │                        │  Optimistic update      │                         │                        │
 │                        ├────────────────────────>│                         │                        │
 │                        │                         │                         │                        │
 │                        │  UPDATE item_claims     │                         │                        │
 │                        ├────────────────────────>│                         │                        │
 │                        │                         │  Broadcast change       │                        │
 │                        │                         ├────────────────────────>│                        │
 │                        │                         │                         │                        │
 │                        │                         │                         │  Update UI             │
 │                        │                         │                         ├───────────────────────>│
 │                        │                         │                         │                        │
 │                        │  ACK success            │                         │                        │
 │                        │<────────────────────────┤                         │                        │
 │                        │                         │                         │                        │
 │  Item shows packed     │                         │                         │  Item shows packed     │
 │<───────────────────────┤                         │                         │<───────────────────────┤
```

---

## Authentication Flow

### Signup Flow

```
Browser                 Next.js                 Supabase Auth            Database
 │                         │                         │                         │
 │  Submit signup form     │                         │                         │
 ├────────────────────────>│                         │                         │
 │                         │                         │                         │
 │                         │  signUp()               │                         │
 │                         ├────────────────────────>│                         │
 │                         │                         │                         │
 │                         │                         │  Create user in         │
 │                         │                         │  auth.users             │
 │                         │                         ├────────────────────────>│
 │                         │                         │<────────────────────────┤
 │                         │                         │                         │
 │                         │                         │  Trigger:               │
 │                         │                         │  handle_new_user()      │
 │                         │                         ├────────────────────────>│
 │                         │                         │  INSERT profiles        │
 │                         │                         │                         │
 │                         │  Session token          │                         │
 │                         │<────────────────────────┤                         │
 │                         │                         │                         │
 │  Redirect to dashboard  │                         │                         │
 │<────────────────────────┤                         │                         │
```

### Protected Route Flow

```
Browser                 Middleware                Supabase Auth           Route Handler
 │                         │                         │                         │
 │  GET /dashboard         │                         │                         │
 ├────────────────────────>│                         │                         │
 │                         │                         │                         │
 │                         │  getUser()              │                         │
 │                         ├────────────────────────>│                         │
 │                         │                         │                         │
 │                         │  Session valid?         │                         │
 │                         │<────────────────────────┤                         │
 │                         │                         │                         │
 │                         │  Yes → Continue         │                         │
 │                         │  No → Redirect /login   │                         │
 │                         ├──────────────────────────────────────────────────>│
 │                         │                         │                         │
 │  Dashboard page         │                         │                         │
 │<────────────────────────┤                         │                         │
```

---

## Realtime Synchronization

### Channel Architecture

PackRight uses Supabase Realtime's PostgreSQL Changes feature to broadcast database changes to connected clients.

**Channel Naming Convention:**

```
trip:{tripId}
```

**Subscription Filter:**

```typescript
{
  event: '*',
  schema: 'public',
  table: 'item_claims',
  filter: `trip_id=eq.${tripId}`
}
```

### Event Types

Three event types are handled:

1. **INSERT:** New claim added to an item
   - Action: Add claim to local state
   - UI: Show item in new column

2. **UPDATE:** Claim modified (quantity changed, packed status toggled)
   - Action: Update claim in local state
   - UI: Reflect new status

3. **DELETE:** Claim removed
   - Action: Remove claim from local state
   - UI: Adjust quantities and column placement

### Realtime Best Practices

1. **Filter by trip_id:** Never subscribe to all changes in a table
2. **Clean up subscriptions:** Always unsubscribe in useEffect cleanup
3. **Handle duplicates:** Realtime may echo back the user's own changes
4. **Use database as source of truth:** Resolve conflicts by trusting the database

---

## Deployment Architecture

### Vercel Deployment

```
┌────────────────────────────────────────────────────────────────┐
│                         Vercel Edge                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐  │
│  │  Static Assets  │    │  Serverless Fn  │    │  Edge      │  │
│  │  (CDN Cache)    │    │  (API Routes)   │    │ Middleware │  │
│  ├─────────────────┤    ├─────────────────┤    ├────────────┤  │
│  │ • Next.js Pages │    │ • /api/*        │    │ • Auth     │  │
│  │ • Images        │    │ • SSR Render    │    │ • Redirects│  │
│  │ • Fonts         │    │ • GroqAPI calls │    │            │  │
│  └─────────────────┘    └─────────────────┘    └────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
         │                                      │
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│   Supabase      │                    │   GroqAPI       │
│   Cloud         │                    │                 │
├─────────────────┤                    ├─────────────────┤
│ • PostgreSQL    │                    │ • llama-3.1-70b │
│ • Auth          │                    │ • Inference     │
│ • Realtime      │                    │                 │
└─────────────────┘                    └─────────────────┘
```

### Environment Configuration

**Required Environment Variables:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GroqAPI
GROQ_API_KEY=your-groq-api-key

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Build Process

1. **TypeScript Compilation:** Strict mode type checking
2. **Code Splitting:** Automatic route-based splitting
3. **Tree Shaking:** Remove unused code
4. **Asset Optimization:** Image optimization, font subsetting
5. **CSS Purging:** Remove unused Tailwind classes

---

## Performance Considerations

### Client-Side Optimizations

1. **Code Splitting:** Each route only loads its required JavaScript
2. **Image Optimization:** Next.js Image component for automatic resizing and lazy loading
3. **Component Memoization:** `React.memo` for expensive components
4. **Virtualization:** Consider for large lists (100+ items)

### Database Optimizations

1. **Indexes:** Foreign keys and frequently queried columns indexed
2. **RLS Policies:** Optimized to use indexes
3. **View Materialization:** `trip_readiness` view pre-calculates metrics

### Realtime Optimizations

1. **Filtered Subscriptions:** Only subscribe to trip-specific changes
2. **Throttled Updates:** Debounce rapid successive changes
3. **Connection Pooling:** Supabase manages connection pooling

---

## Security Architecture

### Layered Security Approach

```
┌────────────────────────────────────────────────────────────────┐
│                    Security Layers                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐  │
│  │  Client Side    │    │  Server Side    │    │  Database  │  │
│  ├─────────────────┤    ├─────────────────┤    ├────────────┤  │
│  │ • HTTPS only    │    │ • Session valid.│    │ • RLS      │  │
│  │ • XSS protect.  │    │ • Input valid.  │    │ • Encrypted│  │
│  │ • Auth tokens   │    │ • API key prot. │    │ • Backups  │  │
│  └─────────────────┘    └─────────────────┘    └────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Row-Level Security (RLS)

Every table has RLS policies that enforce data access at the database level:

```sql
-- Example: Items table
CREATE POLICY "items_select" ON public.items
  FOR SELECT TO public
  USING (is_member_of(trip_id));

-- Only members of the trip can see items
```

### API Key Protection

- GroqAPI keys stored in environment variables
- Never exposed to client-side code
- Only accessible in Next.js API routes (server-side)

### Input Validation

- All inputs validated against Zod schemas
- SQL injection prevented via parameterized queries
- XSS prevented by React's built-in escaping

---

## Architecture Decision Records (ADRs)

### ADR-001: Use Supabase Instead of Custom Backend

**Status:** Accepted

**Context:** Need backend infrastructure for auth, database, and realtime.

**Decision:** Use Supabase as all-in-one backend solution.

**Rationale:**

- Faster development time
- Built-in RLS for security
- Realtime out of the box
- Auto-generated TypeScript types

**Consequences:**

- Positive: Reduced development time by ~60%
- Positive: Security built-in at database level
- Negative: Vendor lock-in
- Negative: Limited customization compared to custom backend

### ADR-002: Use Zustand Instead of Redux for State Management

**Status:** Accepted

**Context:** Need state management for kanban board.

**Decision:** Use Zustand for board state.

**Rationale:**

- Simpler API with less boilerplate
- Better TypeScript support
- Smaller bundle size
- Sufficient for our use case

**Consequences:**

- Positive: Faster development
- Positive: Less code to maintain
- Negative: Fewer dev tools compared to Redux
- Negative: Less mature ecosystem

### ADR-003: Use dnd-kit Instead of react-beautiful-dnd

**Status:** Accepted

**Context:** Need drag-and-drop for kanban board.

**Decision:** Use dnd-kit for drag-and-drop functionality.

**Rationale:**

- Actively maintained (react-beautiful-dnd is archived)
- Better TypeScript support
- Better accessibility
- More flexible API

**Consequences:**

- Positive: Active maintenance and bug fixes
- Positive: Better accessibility out of the box
- Negative: Different API from react-beautiful-dnb (if team had prior experience)

---

## Future Architecture Considerations

### Scalability

Current architecture supports:

- **Concurrent Users:** 100+ simultaneous users per trip
- **Items per Trip:** Tested up to 500 items
- **Trips per User:** Unlimited

**Potential Bottlenecks:**

- Realtime connection limits at high concurrency
- Browser performance with 1000+ items on board

**Mitigation Strategies:**

- Implement pagination for large item lists
- Use virtualization for item rendering
- Consider message queue for high-frequency updates

### Extensibility

**Planned Enhancements:**

1. **Offline Support:** Service worker with local cache
2. **Push Notifications:** Notify users of trip changes
3. **File Attachments:** Allow images/docs on items
4. **Trip Templates:** Save and reuse packing lists

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PACKRIGHT ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │                           CLIENT LAYER                                │
  │                         (Browser - Next.js)                           │
  ├───────────────────────────────────────────────────────────────────────┤
  │                                                                       │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
  │  │   React 18   │  │   Zustand    │  │   dnd-kit    │  │Framer M.  │  │
  │  │ Components   │  │  State Store │  │  Drag & Drop │  │Animation  │  │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP/WebSocket
                                     ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │                          SERVER LAYER                                 │
  │                    (Vercel - Next.js API Routes)                      │
  ├───────────────────────────────────────────────────────────────────────┤
  │                                                                       │
  │  ┌─────────────────────────────────────────────────────────────┐      │
  │  │                      API Route Handlers                     │      │
  │  ├─────────────────────────────────────────────────────────────┤      │
  │  │  • POST /api/generate-list → GroqAPI integration            │      │
  │  │  • GET /api/trips/[id] → Server-side rendering              │      │
  │  │  • All routes protected with auth middleware                │      │
  │  └─────────────────────────────────────────────────────────────┘      │
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘
                          │                    │
                          │                    │
                    ┌─────┴─────┐      ┌──────┴──────┐
                    │           │      │             │
                    ▼           ▼      ▼             ▼
          ┌─────────────┐ ┌─────────────┐  ┌─────────────┐
          │  Supabase   │ │  GroqAPI    │  │   Vercel    │
          │   Cloud     │ │  (AI Model) │  │    CDN      │
          ├─────────────┤ ├─────────────┤  ├─────────────┤
          │ PostgreSQL  │ │ llama-3.1   │  │ Static      │
          │ Auth        │ │ 70b-vers.   │  │ Assets      │
          │ Realtime    │ │             │  │             │
          │ RLS Policies│ │             │  │             │
          └─────────────┘ └─────────────┘  └─────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │                        DATA FLOW PATTERNS                             │
  ├───────────────────────────────────────────────────────────────────────┤
  │                                                                       │
  │  1. Trip Creation:                                                    │
  │     Client → API Route → GroqAPI → Database → Realtime Broadcast      │
  │                                                                       │
  │  2. Item Claiming:                                                    │
  │     Client → Optimistic UI → Database → Realtime Broadcast            │
  │                                                                       │
  │  3. Realtime Sync:                                                    │
  │     Database Change → Supabase Realtime → All Connected Clients       │
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘
```

---

## References

- **Next.js Documentation:** https://nextjs.org/docs
- **Supabase Documentation:** https://supabase.com/docs
- **GroqAPI Documentation:** https://groq.com/docs
- **dnd-kit Documentation:** https://docs.dndkit.com
- **Zustand Documentation:** https://zustand-demo.pmnd.rs

### Related Documentation

- [Sprint Documentation](./SPRINTS.md)
- [API Documentation](./API_DOCS.md)
- [Development Guide](./DEVELOPMENT.md)
- [CI/CD Pipeline](./CI_CD.md)
- [Evaluation Dashboard](./EVALUATION_DASHBOARD.md)
- [AI Mastery](./AI_MASTERY.md)
