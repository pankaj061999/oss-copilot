# AGENTS.md

Welcome AI coding agents and autonomous contributors to OSS Copilot!

This repository follows strict engineering and code quality rules:

## Engineering Standards
- **Language**: TypeScript with strict mode enabled.
- **Runtime**: Node.js 22+.
- **No Mock or Fake Data in Production**: All production adapters must interface directly with GitHub and AI providers.
- **Extensible AI Interface**: Keep the AI provider abstract (`AIProvider` interface) to easily plug in other LLM backends (Anthropic, Gemini, local Ollama).
- **Safety First**: Never log API keys or secrets. Sanitize markdown before posting comments to GitHub.
- **Testing**: All new commands and analyzers must include unit tests in `tests/` using Vitest with mocked network responses. Never execute real API calls in CI tests.
- **Maintainer Authority**: AI suggestions must remain suggestions. The tool must never automatically merge pull requests or automatically close issues.

## Development Workflow
1. `npm install`
2. `npm run typecheck`
3. `npm test`
4. `npm run lint`
5. `npm run format`
6. `npm run build`
