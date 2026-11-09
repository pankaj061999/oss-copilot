# Contributing to OSS Copilot

Thank you for your interest in contributing to OSS Copilot! We welcome community contributions that help make open-source maintenance more efficient and enjoyable.

## Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to [pankaj061999@users.noreply.github.com](mailto:pankaj061999@users.noreply.github.com).

## Getting Started

### Prerequisites
- Node.js 22.0.0 or higher
- npm 10+
- Git

### Local Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/pankaj061999/oss-copilot.git
   cd oss-copilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
   Add your `OPENAI_API_KEY` and optional `GITHUB_TOKEN`.

4. Build the project:
   ```bash
   npm run build
   ```

5. Run test suite:
   ```bash
   npm test
   ```

## Development Guidelines

- **TypeScript Strictness**: Code must pass `npm run typecheck` without warnings or any-casting.
- **Testing**: Write unit tests for new features and bug fixes under `tests/`. Tests must mock external API calls.
- **Code Style**: Run `npm run lint` and `npm run format:fix` prior to submitting a pull request.
- **Security & Privacy**: Ensure no sensitive keys or tokens are leaked in logs, traces, or test fixtures.
- **Git Commit Convention**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add duplicate check threshold`, `fix: handle empty diff`).

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-improvement`.
2. Commit your changes and verify with `npm run build && npm test && npm run lint`.
3. Push to your branch and open a PR against `main`.
4. Fill in the Pull Request template completely.
