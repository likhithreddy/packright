---
trigger: always_on
---

# PackRight Scrum & Workflow Rules

**[CRITICAL AI COMMUNICATION DIRECTIVE]**

```markdown
When communicating with the developer outside of generating designated reports or code blocks or generating commit messages, the AI must prefix _all_ conversational responses with the phrase `[SCRUM AND WORKFLOW RULE ACKNOWLEDGED]` and start actual response from next line.
```

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
- **Commit Frequency**: Commit often (e.g., after creating a component, after writing a test) to build a valid history checkpoint. You must explicitly run `yarn format` and `yarn lint` to ensure strict Prettier compliance and code quality, and **always run tests with coverage (`yarn test --coverage`) testing both unit and integration tests** before EVERY commit and before raising a PR to ensure that at least 80% coverage is maintained. Explicitly commit the moment an issue implementation is completed in full.
- **Commit Format**: Start the message with the bracketed issue reference. Example: `[#42] feat: implement real-time kanban board`.

### Code Comments & Referencing

- When leaving a TODO related to an active tracking issue, or marking code for a future sprint task, strictly use this format:
  `// ISSUE-#<number>: <description>`.
  _(Example: `// ISSUE-#42: Implement dnd-kit sortable context here`)_

### PR Workflow

- Open the PR against `main`.
- Link the GitHub issue in the PR description to trigger automatic closure upon merge (e.g., `Closes #42`).
- A PR is blocked unless: (a) Automated tests pass, (b) 80% coverage is maintained, (c) Code reviews (if applicable) are approved, and (d) ESLint/Prettier checks pass.
