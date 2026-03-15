# PackRight CI/CD Documentation

This document provides comprehensive information about PackRight's continuous integration and deployment pipeline, including pre-commit checks, pipeline architecture, and troubleshooting guidance.

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [GitHub Actions Workflow](#github-actions-workflow)
4. [Pre-Commit Checks](#pre-commit-checks)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting CI Failures](#troubleshooting-ci-failures)
7. [Pipeline Status Summary](#pipeline-status-summary)

---

## Overview

PackRight uses GitHub Actions for continuous integration and deployment. The pipeline runs on every pull request to `main` and enforces strict quality gates before code can be merged.

**Workflow File:** `.github/workflows/ci.yml`

**Pipeline Triggers:**

- Pull requests targeting the `main` branch

---

## Pipeline Architecture

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     GitHub Actions CI Pipeline                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐   │
│  │ Lint & Format   │    │ Unit & Coverage │    │ E2E Tests   │   │
│  │     Job         │    │     Job         │    │    Job      │   │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────┤   │
│  │ • Prettier      │    │ • Jest Tests    │    │ • Playwright│   │
│  │ • ESLint        │    │ • Coverage      │    │ • 3 Browsers│   │
│  └─────────────────┘    └─────────────────┘    └─────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  Security Scan Job                         │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ • Yarn Audit                                               │  │
│  │ • Vulnerability Check                                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Quality Gates

**All Pull Requests Must:**

- [x] Pass ESLint with zero errors/warnings
- [x] Pass Prettier formatting checks
- [x] Pass all unit tests (518 tests)
- [x] Pass all integration tests (493 tests)
- [x] Pass all E2E tests (24 tests)
- [x] Maintain 80%+ test coverage
- [x] Have no high/critical security vulnerabilities

**Merge Blockers:**

- ❌ Any failing job
- ❌ Coverage below 80%
- ❌ TypeScript compilation errors
- ❌ ESLint errors
- ❌ Prettier formatting issues
- ❌ High/critical security vulnerabilities

---

## GitHub Actions Workflow

### Job Definitions

#### 1. Lint & Format Job

**Purpose:** Ensure code quality and consistent formatting

**Steps:**

```yaml
- Checkout code
- Setup Node.js 20 with yarn cache
- Install dependencies (yarn install --frozen-lockfile)
- Check Formatting (yarn prettier --check .)
- Run ESLint (yarn lint)
```

**Duration:** ~45 seconds

**Success Criteria:**

- Zero Prettier formatting differences
- Zero ESLint errors/warnings

---

#### 2. Unit Tests & Coverage Job

**Purpose:** Validate business logic and enforce coverage thresholds

**Steps:**

```yaml
- Checkout code
- Setup Node.js 20 with yarn cache
- Install dependencies (yarn install --frozen-lockfile)
- Run Jest Unit and Integration Tests with coverage
```

**Duration:** ~2 minutes

**Tests Executed:**

- 518 unit tests
- 493 integration tests

**Coverage Requirements:**
| Metric | Threshold | Current |
|--------|-----------|---------|
| Statements | 80% | 92.25% |
| Branches | 80% | 83.9% |
| Functions | 80% | 94.0% |
| Lines | 80% | 93.44% |

---

#### 3. Playwright E2E Tests Job

**Purpose:** Validate critical user flows across browsers

**Steps:**

```yaml
- Checkout code
- Setup Node.js 20 with yarn cache
- Install dependencies
- Cache Playwright browsers (if available)
- Install Playwright browsers (if not cached)
- Run Playwright E2E tests (yarn test:e2e)
```

**Duration:** ~5 minutes

**Browsers Tested:**

- Chromium
- Firefox
- WebKit

**Test Scenarios:**

- Authentication & onboarding (5 tests)
- Trip creation (4 tests)
- Kanban board operations (8 tests)
- Member management (4 tests)
- Group readiness (3 tests)

---

#### 4. Security Scan Job

**Purpose:** Detect security vulnerabilities in dependencies

**Steps:**

```yaml
- Checkout code
- Setup Node.js 20 with yarn cache
- Install dependencies
- Run Yarn Audit (yarn audit --groups dependencies --level high)
```

**Duration:** ~20 seconds

**Vulnerability Levels Checked:**

- High
- Critical

**Success Criteria:**

- Zero high/critical vulnerabilities

---

### Pipeline Execution

**Total Duration:** ~12 minutes (all jobs run in parallel)

**When Pipeline Runs:**

1. Developer pushes to feature branch
2. Developer creates pull request to `main`
3. GitHub Actions automatically triggers CI pipeline
4. All 4 jobs run in parallel
5. Pipeline must pass before PR can be merged

**Status Indicators:**

- [x] Green checkmark: All jobs passed
- ❌ Red X: One or more jobs failed
- 🟡 Yellow dot: Pipeline still running

---

## Pre-Commit Checks

Before committing code, developers should run these checks locally to catch issues early.

### Mandatory Pre-Commit Commands

```bash
# 1. Run ESLint
yarn lint

# Expected: Zero ESLint errors or warnings

# 2. Run Prettier
yarn format

# Expected: "No formatting needed" or shows files to format
# To fix formatting issues: yarn format:write

# 3. Run type checking
yarn type-check

# Expected: Zero TypeScript errors

# 4. Run unit tests with coverage
yarn test --coverage

# Expected: All tests pass, coverage ≥ 80%

# 5. Run integration tests
yarn test:integration

# Expected: All integration tests pass
```

**All checks must pass before committing.**

### Pre-Commit Hook (Optional)

Developers can optionally set up a git pre-commit hook to automate these checks:

```bash
# Create .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

yarn lint || exit 1
yarn format:check || exit 1
yarn type-check || exit 1
yarn test --coverage --passWithNoTests || exit 1
```

---

## Environment Variables

### Required for CI Pipeline

The GitHub Actions workflow requires the following environment variables to be configured in GitHub repository secrets:

**Note:** Most variables are not needed in CI as tests use mocks/testcontainers. If you add deployment or other jobs, configure these:

| Variable                        | Description                   | Required       |
| ------------------------------- | ----------------------------- | -------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL          | For tests only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key        | For tests only |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key     | For tests only |
| `GROQ_API_KEY`                  | GroqAPI key for AI generation | For tests only |

### GitHub Secrets Configuration

To configure secrets in GitHub:

1. Navigate to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each variable with its value

**Security Note:** Never commit these values to the repository.

---

## Troubleshooting CI Failures

### Lint or Format Failures

**Symptom:** ESLint errors or Prettier formatting issues

**Solution:**

```bash
# Run locally to see issues
yarn lint

# Fix auto-fixable ESLint issues
yarn lint:fix

# Check formatting
yarn format:check

# Fix formatting issues
yarn format:write

# Commit the fixes and push
```

---

### Test Failures

**Symptom:** Unit, integration, or E2E tests failing

**Unit/Integration Tests:**

```bash
# Run locally to debug
yarn test

# Run specific failing test
yarn test --testNamePattern="should do something"

# Run with verbose output
yarn test --verbose

# Check coverage report
open coverage/index.html
```

**E2E Tests:**

```bash
# Run E2E tests locally
yarn test:e2e

# Run specific test file
yarn test:e2e tests/e2e/auth.spec.ts

# Run with headed browser (see what's happening)
yarn test:e2e --headed

# Run in debug mode
yarn test:e2e --debug

# View HTML report
yarn test:e2e:show-report
```

**Common Causes:**

- Timing issues: Increase wait timeouts
- Selector changes: Update test selectors to match new UI
- Test data issues: Ensure proper test setup/teardown
- Flaky tests: Run multiple times to confirm consistency

---

### Coverage Below 80%

**Symptom:** Coverage threshold validation fails

**Solution:**

```bash
# Generate coverage report
yarn test --coverage

# Open coverage report
open coverage/index.html

# Identify uncovered files/lines
# Add tests for uncovered code paths

# Verify coverage passes locally
yarn test --coverage

# Commit new tests
```

**Tips for Improving Coverage:**

1. Focus on high-value code paths first
2. Test edge cases and error conditions
3. Test utility functions thoroughly
4. Don't test trivial code (getters/setters)

---

### Security Vulnerabilities

**Symptom:** Yarn audit finds high/critical vulnerabilities

**Solution:**

```bash
# Check vulnerabilities locally
yarn audit

# Check all levels (not just high/critical)
yarn audit --level all

# Update vulnerable packages
yarn update

# If update doesn't work:
# 1. Check Dependabot alerts for remediation
# 2. Review package changelog for breaking changes
# 3. Test thoroughly after updating
```

**Note:** Some vulnerabilities may be in transitive dependencies. Use `yarn audit --groups dependencies` to check production dependencies only.

---

### Flaky E2E Tests

**Symptom:** Tests pass locally but fail in CI (or vice versa)

**Possible Causes:**

1. **Timing issues:** CI environments may be slower
2. **Race conditions:** Tests depend on unpredictable timing
3. **Resource constraints:** CI has limited CPU/memory

**Solutions:**

```bash
# Increase test timeout
// In test file:
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
})

# Use explicit waits instead of implicit
await page.waitForSelector('button', { state: 'visible' })

// Avoid arbitrary sleeps
// Bad: await page.waitForTimeout(1000)
// Good: await page.waitForResponse('**/api/data')

# Ensure proper cleanup between tests
test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
});
```

---

### Type Checking Errors

**Symptom:** TypeScript compilation fails

**Solution:**

```bash
# Run type check locally
yarn type-check

# Fix TypeScript errors
# Common issues:
# 1. Missing types: yarn add @types/package-name
# 2. Implicit any: Add proper type annotations
# 3. Null/undefined: Add null checks or optional chaining

# Verify fix
yarn type-check
```

---

## Pipeline Status Summary

### Current Metrics

| Metric                | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| **Pipeline Duration** | ~12 minutes                                                    |
| **Success Rate**      | 98%+                                                           |
| **Jobs**              | 4 (parallel)                                                   |
| **Total Tests**       | 1,035 (518 unit + 493 integration + 24 E2E)                    |
| **Coverage**          | 92.25% statements, 83.9% branches, 94% functions, 93.44% lines |

### Recent Pipeline Performance

**Average Job Duration:**

- Lint & Format: ~30-45 seconds
- Unit & Coverage: ~2 minutes
- E2E Tests: ~5 minutes
- Security Scan: ~15-20 seconds

---

## CI/CD Best Practices

### For Developers

1. **Run Pre-Commit Checks Locally:** Catch issues before pushing
2. **Keep PRs Focused:** Smaller PRs are easier to review and debug
3. **Write Tests First:** Follow TDD to maintain coverage
4. **Monitor Pipeline Status:** Watch for flaky tests and fix immediately
5. **Update Dependencies Regularly:** Stay on top of security updates

### For Maintainers

1. **Review Failed Pipelines:** Don't ignore red X's
2. **Fix Flaky Tests:** Unreliable tests undermine confidence
3. **Keep Dependencies Updated:** Use Dependabot PRs
4. **Monitor Coverage Trends:** Watch for unexpected drops
5. **Document Pipeline Changes:** Update this file when workflow changes

---

## Related Documentation

- [Development Guide](./DEVELOPMENT.md) - Local development setup and workflow
- [Testing Guide](./DEVELOPMENT.md#testing-guide) - Detailed testing instructions
- [Evaluation Dashboard](./EVALUATION_DASHBOARD.md) - Test results and metrics
- [Sprint Documentation](./SPRINTS.md) - Sprint 1 CI/CD setup details

---

**Last Updated:** March 15, 2026
**Maintained By:** Likhith Reddy Rechintala, Jaya Sriharshita Koneti
