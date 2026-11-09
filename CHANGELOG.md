# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of OSS Copilot.
- CLI with `review-pr`, `triage`, `duplicate-check`, `release-notes`, `changelog`, and `health` commands.
- Modular architecture with GitHub client and extensible AI provider.
- OpenAI provider implementation with structured JSON responses and retry logic.
- PR analyzer with risk rating, security checks, bug detection, and test suggestions.
- Issue triage with automated classification (bug, feature, documentation, question, security, performance, duplicate, other).
- Duplicate issue detection with similarity scoring and matching issue references.
- Automated static pattern scanner for hardcoded credentials, secret keys, and dangerous commands.
- Release notes generator grouped into Features, Bug Fixes, Performance, Security, Documentation, and Breaking Changes.
- Smart CHANGELOG.md updater that preserves prior history.
- Repository health analyzer scoring community standards, documentation, CI, and maintenance freshness (0-100).
- GitHub Action definition and CI workflows for automated pull request reviews.
