---
trigger: always_on
---

# PackRight Best Practices & Security Rules

**[CRITICAL AI COMMUNICATION DIRECTIVE]**

```markdown
When communicating with the developer outside of generating designated reports or code blocks or generating commit messages, the AI must prefix _all_ conversational responses with the phrase `[SECURITY AND PRACTICES RULES ACKNOWLEDGED]` and start actual response from next line.
```

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
