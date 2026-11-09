# OSS Copilot

> AI-powered toolkit for GitHub code reviews, issue triage, and open-source maintenance.

[![CI](https://github.com/pankaj061999/oss-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/pankaj061999/oss-copilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Why OSS Copilot Exists](#2-why-oss-copilot-exists)
- [3. Features](#3-features)
- [4. Architecture](#4-architecture)
- [5. Installation](#5-installation)
- [6. CLI Usage](#6-cli-usage)
  - [Pull Request Review (`review-pr`)](#pull-request-review-review-pr)
  - [Issue Triage (`triage`)](#issue-triage-triage)
  - [Duplicate Issue Detection (`duplicate-check`)](#duplicate-issue-detection-duplicate-check)
  - [Release Notes Generation (`release-notes`)](#release-notes-generation-release-notes)
  - [Changelog Updater (`changelog`)](#changelog-updater-changelog)
  - [Repository Health Audit (`health`)](#repository-health-audit-health)
- [7. GitHub Action Setup](#7-github-action-setup)
- [8. Configuration (`.oss-copilot.yml`)](#8-configuration-oss-copilotyml)
- [9. OpenAI API Setup](#9-openai-api-setup)
- [10. Real-World Examples](#10-real-world-examples)
- [11. Security and Privacy](#11-security-and-privacy)
- [12. Local Development](#12-local-development)
- [13. Testing](#13-testing)
- [14. Contributing](#14-contributing)
- [15. Roadmap](#15-roadmap)
- [16. License](#16-license)

---

## 1. Project Overview

**OSS Copilot** is a modular, production-ready developer toolkit designed to alleviate the daily maintenance burden on open-source authors and core teams. Built with TypeScript, Node.js 22+, and the GitHub REST API, it automates repetitive workflows—including code reviews, issue triaging, duplicate detection, release notes compilation, and repository health audits—while keeping human maintainers firmly in control.

OSS Copilot works seamlessly both as a **standalone CLI** on your local machine and as an **automated GitHub Action** in your CI/CD pipelines.

---

## 2. Why OSS Copilot Exists

Maintaining open-source software is demanding:
- Maintainers receive dozens of pull requests containing subtle regressions, missing unit tests, or unformatted code.
- Issue trackers get flooded with incomplete bug reports, duplicate questions, and missing reproduction steps.
- Security vulnerabilities and accidentally committed credentials slip into PR diffs unnoticed.
- Preparing release notes and updating `CHANGELOG.md` across dozens of merged PRs consumes hours of manual work.

OSS Copilot provides an intelligent, automated assistant that performs preliminary static security checks, categorizes issues, evaluates duplicates semantically, drafts empathetic maintainer responses, and generates structured release documentation.

> [!IMPORTANT]
> **Maintainer Authority:** OSS Copilot acts as an advisor, not an autonomous dictator. It **never** automatically merges pull requests, **never** automatically closes issues without consent, and clearly labels all security checks as automated preliminary assessments.

---

## 3. Features

- **Automated Pull Request Code Review**: Analyzes git diffs for logic bugs, performance concerns, maintainability issues, and missing tests. Computes an overall risk level (`low`, `medium`, `high`, `critical`).
- **Static Security & Secret Scanner**: Pre-scans diffs for accidentally committed GitHub tokens, OpenAI keys, AWS credentials, private keys, dangerous shell piping (`curl | bash`), and excessive file permissions (`chmod 777`).
- **Intelligent Issue Triage**: Classifies incoming issues (`bug`, `feature`, `documentation`, `question`, `security`, `performance`, `duplicate`, `other`), assigns priority & severity, recommends labels, and drafts professional maintainer responses.
- **Semantic Duplicate Issue Detection**: Compares new issues against recent open and closed issues using semantic reasoning, calculating match confidence percentages and citing exact issue numbers with explanations.
- **Grouped Release Notes Generator**: Compares tags/commits and clusters changes into Features, Bug Fixes, Performance, Security, Documentation, and Breaking Changes, with contributor attributions.
- **Lossless Changelog Manager**: Updates `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) standards without destroying existing history.
- **Repository Health Auditing**: Scores repository hygiene from 0 to 100 based on community health standards (README, LICENSE, SECURITY.md, CONTRIBUTING.md, CI workflows, automated test setup, and release cadence) and returns actionable recommendations.
- **Privacy First**: Secrets and tokens are redacted from logs and error traces. Diff payloads are truncated and filtered to exclude sensitive lockfiles and binary assets.

---

## 4. Architecture

OSS Copilot is structured into modular layers with strict separation of concerns:

```
src/
├── ai/                     # AI provider abstraction & OpenAI implementation
│   ├── provider.ts         # Abstract AIProvider interface & factory
│   └── openai-provider.ts  # Structured completions with JSON mode & retries
├── analyzers/              # Core domain analyzers
│   ├── pr-analyzer.ts      # PR diff, risk calculation & markdown formatter
│   ├── issue-triage.ts     # Issue classifier & response generator
│   ├── duplicate-detector.ts # Semantic duplicate comparator
│   ├── security-analyzer.ts# Static regex pattern security scanner
│   ├── release-notes-generator.ts # Tag comparator & grouped release compiler
│   ├── changelog-generator.ts     # Lossless CHANGELOG.md updater
│   └── repo-health.ts      # 0-100 hygiene scoring & audit recommendations
├── cli/                    # Commander.js CLI entrypoint
│   └── index.ts
├── commands/               # CLI command orchestrators
│   ├── review-pr.ts
│   ├── triage.ts
│   ├── duplicate-check.ts
│   ├── release-notes.ts
│   ├── changelog.ts
│   └── health.ts
├── config/                 # YAML configuration loader & Zod validation
├── github/                 # Octokit wrapper with exponential backoff
│   └── client.ts
├── types/                  # TypeScript interfaces & Zod schemas
├── utils/                  # Logger, secret redaction, markdown sanitizer, diff parser
└── workflows/              # GitHub Action runner
    └── action-runner.ts
```

---

## 5. Installation

### Global CLI Installation
```bash
npm install -g oss-copilot
```

### Local Project Dependency
```bash
npm install --save-dev oss-copilot
```

### Running with npx
```bash
npx oss-copilot --help
```

---

## 6. CLI Usage

Verify installation:
```bash
oss-copilot --version
oss-copilot --help
```

### Pull Request Review (`review-pr`)
Analyze a pull request for potential bugs, security concerns, performance, and missing test coverage:

```bash
# Review PR #42 in terminal
oss-copilot review-pr facebook/react --pr 42

# Review and post markdown comment directly to GitHub PR
oss-copilot review-pr facebook/react --pr 42 --comment

# Fail with non-zero exit code if high/critical risk is found (useful for CI gates)
oss-copilot review-pr facebook/react --pr 42 --fail-on-risk
```

### Issue Triage (`triage`)
Classify an issue, suggest labels, prioritize, and generate a draft maintainer response:

```bash
# Triage issue #105
oss-copilot triage vercel/next.js --issue 105

# Triage and automatically apply recommended labels to GitHub
oss-copilot triage vercel/next.js --issue 105 --apply-labels

# Triage and post maintainer response as a comment
oss-copilot triage vercel/next.js --issue 105 --comment
```

### Duplicate Issue Detection (`duplicate-check`)
Compare an issue against recent issues to find potential duplicates:

```bash
# Check issue #88 with default 0.75 similarity threshold
oss-copilot duplicate-check expressjs/express --issue 88

# Check with custom similarity threshold (e.g. 0.85) and 100 issue scan window
oss-copilot duplicate-check expressjs/express --issue 88 --threshold 0.85 --max-scan 100
```

### Release Notes Generation (`release-notes`)
Generate categorized release notes between two Git tags or commits:

```bash
# Compare v1.0.0 to v1.1.0 and print to terminal
oss-copilot release-notes owner/repo --from v1.0.0 --to v1.1.0

# Save release notes to a markdown file
oss-copilot release-notes owner/repo --from v1.0.0 --to v1.1.0 --output RELEASE_NOTES.md
```

### Changelog Updater (`changelog`)
Update `CHANGELOG.md` without destroying existing entries:

```bash
# Update CHANGELOG.md with release v1.1.0 changes
oss-copilot changelog owner/repo --from v1.0.0 --to v1.1.0

# Update a custom changelog path
oss-copilot changelog owner/repo --from v1.0.0 --to v1.1.0 --file docs/HISTORY.md
```

### Repository Health Audit (`health`)
Audit repository community files, documentation, CI workflows, and maintenance freshness:

```bash
# Audit repository hygiene (scores 0-100)
oss-copilot health owner/repo

# Require minimum score in CI (fails if score < 80)
oss-copilot health owner/repo --min-score 80
```

---

## 7. GitHub Action Setup

Add OSS Copilot to your repository by creating `.github/workflows/oss-copilot.yml`:

```yaml
name: OSS Copilot Automated Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  issues:
    types: [opened, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  copilot:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Run OSS Copilot
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          GITHUB_EVENT_NAME: ${{ github.event_name }}
          GITHUB_EVENT_PATH: ${{ github.event_path }}
        run: |
          npx oss-copilot
```

---

## 8. Configuration (`.oss-copilot.yml`)

Create `.oss-copilot.yml` in the root of your repository to customize behavior:

```yaml
provider: openai
model: gpt-4o-mini

review:
  enabled: true
  postComment: false
  maxDiffLength: 20000
  ignoreFiles:
    - "*.min.js"
    - "*.lock"
    - "package-lock.json"
    - "yarn.lock"
    - "pnpm-lock.yaml"
    - "*.svg"

triage:
  enabled: true
  postComment: false
  applyLabels: false

security:
  enabled: true
  failOnHighRisk: false

duplicateCheck:
  enabled: true
  similarityThreshold: 0.75
  maxIssuesToScan: 50

releaseNotes:
  enabled: true
  includeContributors: true
```

---

## 9. OpenAI API Setup

1. Obtain an API key from [platform.openai.com](https://platform.openai.com/api-keys).
2. Set the environment variable locally in a `.env` file:
   ```bash
   cp .env.example .env
   ```
   Add:
   ```env
   OPENAI_API_KEY=sk-proj-...
   GITHUB_TOKEN=ghp_...
   ```
3. For GitHub Actions, add `OPENAI_API_KEY` under **Repository Settings > Secrets and variables > Actions**.

---

## 10. Real-World Examples

### PR Review Markdown Output
```markdown
## 🤖 OSS Copilot Pull Request Review: #42

**PR:** Add rate limiting middleware
**Overall Risk Level:** 🟡 Medium

### 📋 Summary
Introduces in-memory sliding window rate limiting. The implementation is clean, but unhandled Redis connection drops could block request pipelines.

### 🔍 Detailed Findings

| File | Line | Type | Severity | Description & Suggestion |
| ---- | ---- | ---- | -------- | ------------------------ |
| `src/middleware/rate-limit.ts` | 45 | bug | medium | Uncaught exception if Redis client fails to connect.<br/>**Fix:** `Wrap client call in try/catch block.` |

### 🧪 Testing Recommendations
- Test behavior when Redis server is unreachable.
- Test edge case where client sends concurrent bursts at the second boundary.

> [!NOTE]
> ⚠️ Automated Preliminary Check: This is an automated preliminary security scan to catch obvious accidental leaks and risks. It DOES NOT replace human code review, formal security auditing, or specialized SAST/DAST testing.
```

---

## 11. Security and Privacy

Security and privacy are core engineering requirements in OSS Copilot:

- **Zero Secret Logging**: All API keys, authorization headers, and personal access tokens are automatically redacted via `redactSecrets()` before any string is output to logs or transmitted in error stacks.
- **Strict Data Minimization**: Only the targeted PR title, issue body, or truncated diff hunks are transmitted to the AI provider. Binary files, lockfiles, and images are ignored.
- **Markdown Sanitization**: All AI-generated markdown is sanitized with `sanitizeMarkdown()` to strip raw `<script>`, `<iframe>`, and dangerous `javascript:` hyperlinks prior to posting on GitHub.
- **Rate Limit & Retry Handling**: Both GitHub and OpenAI requests use exponential backoff with jitter to handle HTTP 429 and transient 5xx errors smoothly.
- **Preliminary Check Notice**: All automated security findings explicitly declare that they are preliminary checks and do not replace professional audits.

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidelines.

---

## 12. Local Development

### Prerequisites
- Node.js 22.0.0+
- npm 10+

### Setup
```bash
git clone https://github.com/pankaj061999/oss-copilot.git
cd oss-copilot
npm install
cp .env.example .env
npm run build
```

### Available Scripts
- `npm run build`: Compile TypeScript to `dist/`.
- `npm run watch`: Compile TypeScript in watch mode.
- `npm run typecheck`: Run `tsc --noEmit` validation.
- `npm run test`: Run unit tests with Vitest.
- `npm run test:coverage`: Generate unit test code coverage report.
- `npm run lint`: Lint source and test files using ESLint.
- `npm run lint:fix`: Automatically fix ESLint issues.
- `npm run format`: Check code formatting with Prettier.
- `npm run format:fix`: Reformat codebase with Prettier.

---

## 13. Testing

OSS Copilot includes a complete unit test suite powered by [Vitest](https://vitest.dev/). External network calls to GitHub and OpenAI are fully mocked, ensuring fast, deterministic, and credential-free test runs:

```bash
npm test
```

```
 Test Files  12 passed (12)
      Tests  37 passed (37)
```

---

## 14. Contributing

Contributions from the open-source community are warmly welcome! Please review [CONTRIBUTING.md](CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request.

---

## 15. Roadmap

- [x] CLI commands (`review-pr`, `triage`, `duplicate-check`, `release-notes`, `changelog`, `health`)
- [x] OpenAI Provider with structured JSON responses
- [x] Static security pattern scanner for API keys and shell risks
- [x] Lossless Keep a Changelog updater
- [x] GitHub Action composite workflow
- [ ] Support for additional AI providers (Anthropic Claude, Google Gemini, Ollama)
- [ ] Multi-language diff chunking and syntax AST analysis
- [ ] Webhook receiver for self-hosted maintenance bots

---

## 16. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
