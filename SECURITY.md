# Security Policy

## Responsible Disclosure

The OSS Copilot team takes security and user privacy seriously. We appreciate the responsible disclosure of security vulnerabilities by security researchers and the open-source community.

If you believe you have found a security vulnerability in OSS Copilot:

1. **Do not** open a public GitHub issue.
2. Send an email with reproduction steps and details to [pankaj061999@users.noreply.github.com](mailto:pankaj061999@users.noreply.github.com), or use GitHub's private vulnerability reporting feature on the repository.
3. We will acknowledge receipt of your report within 48 hours and work with you to triage and resolve the issue.
4. We request that you give us reasonable time to investigate and release a fix before publishing any details publicly.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Privacy & AI Data Handling

OSS Copilot connects to GitHub APIs and external AI providers (such as OpenAI) to assist maintainers with reviews, triage, and summaries. We adhere to the following strict privacy principles:

### What Data Is Sent to AI Providers?
- **PR Review**: Pull request title, description, branch metadata, and unified diff hunks (truncated to token budgets). Entire binary files, images, and package-lock files are excluded.
- **Issue Triage**: Issue title, body markdown, and label list.
- **Duplicate Detection**: The candidate issue text compared against recent open/closed issue titles and summaries.
- **Release Notes / Changelog**: PR titles, commit messages, labels, and author usernames.

### What Data Is NEVER Sent or Logged?
- **API Keys & Secrets**: `GITHUB_TOKEN`, `OPENAI_API_KEY`, and any authorization headers are kept strictly within memory or local process environment variables. They are redacted from all logs and error traces.
- **Private Repository Code (unless explicitly targeted)**: The CLI and GitHub Action only process the target repository specified in command arguments or GitHub Action context.
- **Git credentials or SSH keys**: Never accessed, read, or transmitted.

### Opt-Out & Granular Controls
Maintainers can disable any feature (e.g., disable AI PR review, disable automated comments, disable release note generation) via `.oss-copilot.yml`.

## Important Security Disclaimer

OSS Copilot includes static pattern detection and AI-assisted security checks on pull requests. **This is an automated preliminary check only.** It is designed to catch common accidental mistakes (such as committed secrets, dangerous shell commands, or exposed tokens). 

**OSS Copilot NEVER claims to replace human code review, formal security audits, penetration testing, or automated SAST/DAST tooling.**
