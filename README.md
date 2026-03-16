# PackRight: Collaborative Trip Packing Made Simple

**AI-powered packing lists with real-time collaboration for group travel.**

---

## 📦 Final Project Deliverables (CS7180)

| Deliverable              | Link                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Demo Video**           | [Watch on YouTube](https://youtu.be/_mb5iR5gVps)                                                                                                                  |
| **Technical Blog**       | [Read on Medium](https://likhithreddyrechintala.medium.com/from-chaos-to-collaboration-building-a-real-time-packing-app-with-ai-powered-development-e5cb202f1c50) |
| **Blog Cross-Post**      | [Read on LinkedIn](https://www.linkedin.com/posts/likhithreddyrechintala_packright-traveltech-grouptravel-activity-7439199827726438400-BmMp)                      |
| **Live Application**     | [packright-hl.vercel.app](https://packright-hl.vercel.app)                                                                                                        |
| **Git Repository**       | [github.com/likhithreddy/packright](https://github.com/likhithreddy/packright)                                                                                    |
| **API Documentation**    | [OpenAPI Spec](./docs/openapi.yaml)                                                                                                                               |
| **Test Coverage Report** | [View Report](./test-report/index.html)                                                                                                                           |
| **E2E Test Report**      | [View Report](./test-report/e2e/index.html)                                                                                                                       |
| **Evaluation Dashboard** | [View Metrics](./docs/EVALUATION_DASHBOARD.md)                                                                                                                    |

---

## Quick Links

| Resource            | Link                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Demo Video**      | [Watch on YouTube](https://youtu.be/_mb5iR5gVps)                                                                                                                  |
| **Technical Blog**  | [Read on Medium](https://likhithreddyrechintala.medium.com/from-chaos-to-collaboration-building-a-real-time-packing-app-with-ai-powered-development-e5cb202f1c50) |
| **Blog Cross-Post** | [Read on LinkedIn](https://www.linkedin.com/posts/likhithreddyrechintala_packright-traveltech-grouptravel-activity-7439199827726438400-BmMp)                      |
| **Git Repository**  | [https://github.com/likhithreddy/packright](https://github.com/likhithreddy/packright)                                                                            |

---

## Overview

PackRight helps groups coordinate packing for shared trips using AI-generated suggestions and a real-time kanban board. Team members can claim items, track what's been packed, and see overall group readiness—all in one collaborative interface.

### The Problem

Planning group travel is stressful. Coordinating who brings what, tracking packing progress, and ensuring nothing gets forgotten is a challenge. Spreadsheets and group chats get messy, and existing apps don't support real-time collaboration.

### Our Solution

PackRight combines AI-powered packing list generation with a collaborative kanban board. Simply describe your trip, get intelligent suggestions, and work with your team to claim and pack items. Watch your group readiness percentage grow as you progress!

---

## Features

### 🤖 AI-Powered List Generation

Describe your trip in natural language and get a contextualized packing list tailored to your destination, dates, and activities. Powered by GroqAPI's fast inference engine.

### 📋 Real-Time Kanban Board

Drag and drop items between columns (Needed → Claimed → Packed). All team members see changes instantly via Supabase Realtime.

### 👥 Team Collaboration

Invite trip members, assign items fairly, and track who's responsible for what. Support for partial quantity claiming (e.g., claim 2 of 4 tents).

### 📊 Group Readiness Dashboard

See at a glance how ready your group is for the trip. Track progress by category and per-member contributions.

### ⚖️ Fair Auto-Assignment

Let our algorithm distribute unassigned items fairly among team members based on current workload.

### 👁️ Personalized Views

Switch between "My View" (your items) and "All Items View" (full trip overview) to focus on what matters to you.

---

## Tech Stack

### Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Drag & Drop:** dnd-kit
- **Animations:** Framer Motion
- **UI Components:** Shadcn UI

### Backend

- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Realtime:** Supabase Realtime
- **AI:** GroqAPI (llama-3.1-70b-versatile)

### Testing

- **Unit Tests:** Jest
- **Integration Tests:** Jest
- **E2E Tests:** Playwright with testcontainers

### Deployment

- **Hosting:** Vercel
- **CI/CD:** GitHub Actions

---

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- Supabase account (free tier works)
- GroqAPI key (free)

### Installation

```bash
# Clone the repository
git clone https://github.com/likhithreddy/packright.git
cd packright

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and GroqAPI credentials

# Run database migrations (via Supabase Dashboard or CLI)
# Apply migrations in supabase/migrations/ folder

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to start packing!

### Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GroqAPI
GROQ_API_KEY=your-groq-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Available Commands

### Development

```bash
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server
```

### Code Quality

```bash
yarn lint             # Run ESLint
yarn lint:fix         # Fix ESLint errors
yarn format           # Check code formatting
yarn format:write     # Format all files with Prettier
yarn type-check       # Run TypeScript type checking
```

### Testing

```bash
# Unit Tests
yarn test             # Run unit tests
yarn test:watch       # Run unit tests in watch mode
yarn test --coverage  # Run unit tests with coverage report

# Integration Tests
yarn test:integration # Run integration tests

# E2E Tests
yarn test:e2e         # Run E2E tests with testcontainers
yarn test:e2e:direct  # Run E2E tests directly (requires running stack)
yarn test:e2e:show-report  # Open E2E HTML report
```

### Database

```bash
yarn db:migrate       # Apply database migrations (requires Supabase CLI)
```

---

## Documentation

| Document                                               | Description                                     |
| ------------------------------------------------------ | ----------------------------------------------- |
| [Sprint Documentation](./docs/SPRINTS.md)              | Sprint planning and retrospectives              |
| [API Documentation](./docs/API_DOCS.md)                | Complete API reference with examples            |
| [Architecture](./docs/ARCHITECTURE.md)                 | System architecture and design patterns         |
| [Development Guide](./docs/DEVELOPMENT.md)             | Local development setup and workflow            |
| [Evaluation Dashboard](./docs/EVALUATION_DASHBOARD.md) | Test results and coverage metrics               |
| [AI Mastery](./docs/AI_MASTERY.md)                     | AI modalities and prompt engineering strategies |

---

## Project Status

**Current Status:** ✅ Complete - All three sprints finished

### Test Coverage

- **Statements:** 92.25%
- **Branches:** 83.9%
- **Functions:** 94.0%
- **Lines:** 93.44%

All metrics exceed the 80% threshold required by our quality standards.

### Completed Features

- ✅ User authentication (email/password)
- ✅ Trip creation with AI-powered packing lists
- ✅ Real-time collaborative kanban board
- ✅ Team member invitation and management
- ✅ Item claiming and packing workflows
- ✅ Partial quantity claiming support
- ✅ Group readiness dashboard
- ✅ Fair auto-assignment algorithm
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Comprehensive test coverage (unit, integration, E2E)

### Issue Tracking

For the final project deliverables, see [Issue #61](https://github.com/likhithreddy/packright/issues/61).

---

## Development Team

**Likhith Reddy Rechintala** - Full Stack Developer

**Jaya Sriharshita Koneti** - Full Stack Developer

---

## License

MIT License - see LICENSE file for details.

---

## Acknowledgments

- **Supabase** for the excellent backend platform
- **GroqAPI** for fast AI inference
- **Vercel** for hosting and deployment
- **shadcn** for beautiful UI components
- **Claude (Anthropic)** for AI assistance during development

---

**Made with ❤️ for CS7180 - Spring 2026**
