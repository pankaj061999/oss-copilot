import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ReleaseNotesGenerator } from "../src/analyzers/release-notes-generator.js";
import { ChangelogGenerator } from "../src/analyzers/changelog-generator.js";
import type { GitHubClient } from "../src/github/client.js";
import type { AIProvider } from "../src/types/ai.js";
import { ConfigSchema } from "../src/types/config.js";
import type { ReleaseNotesResult } from "../src/types/release.js";

describe("Release Notes & Changelog Generator", () => {
  const config = ConfigSchema.parse({});
  const tempChangelogPath = path.resolve(process.cwd(), "TEST_CHANGELOG.md");

  beforeEach(() => {
    if (fs.existsSync(tempChangelogPath)) {
      fs.unlinkSync(tempChangelogPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempChangelogPath)) {
      fs.unlinkSync(tempChangelogPath);
    }
  });

  const mockReleaseResult: ReleaseNotesResult = {
    version: "v1.1.0",
    fromTag: "v1.0.0",
    toTag: "v1.1.0",
    summary: "Release adds duplicate detection and health checks.",
    groups: {
      features: ["Add duplicate issue detection", "Add repository health check"],
      bugFixes: ["Fix token redaction regex"],
      performance: ["Optimize diff parsing speed"],
      security: ["Block unencrypted HTTP URLs in diffs"],
      documentation: ["Update installation guide in README"],
      breakingChanges: ["Change CLI exit codes for security failures"],
    },
    contributors: ["octocat", "pankaj"],
  };

  const mockGithub = {
    compareCommits: vi.fn().mockResolvedValue({
      commits: [
        {
          sha: "abcdef123456",
          commit: { message: "feat: add duplicate detection" },
          author: { login: "octocat" },
        },
        {
          sha: "bcdefa234567",
          commit: { message: "fix: token regex" },
          author: { login: "pankaj" },
        },
      ],
    }),
    listReleases: vi.fn().mockResolvedValue([]),
  } as unknown as GitHubClient;

  const mockAI = {
    name: "mock-ai",
    generateText: vi.fn(),
    generateStructured: vi.fn().mockResolvedValue(mockReleaseResult),
  } as unknown as AIProvider;

  it("should generate structured release notes with all categories and contributors", async () => {
    const generator = new ReleaseNotesGenerator(mockGithub, mockAI, config);
    const { result, markdown } = await generator.generate(
      { owner: "test", repo: "test-repo" },
      { fromTag: "v1.0.0", toTag: "v1.1.0" }
    );

    expect(result.groups.features.length).toBe(2);
    expect(result.groups.breakingChanges.length).toBe(1);
    expect(result.contributors).toContain("octocat");
    expect(markdown).toContain("## Release v1.1.0");
    expect(markdown).toContain("### ⚠️ Breaking Changes");
    expect(markdown).toContain("### ✨ Features");
    expect(markdown).toContain("### 🐛 Bug Fixes");
    expect(markdown).toContain("### 👥 Contributors");
  });

  it("should update existing CHANGELOG.md without destroying prior history", () => {
    const existingContent = `# Changelog\n\nAll notable changes to this project.\n\n## [Unreleased]\n\n## [v1.0.0] - 2026-01-01\n\n### Added\n- Initial release.\n`;
    fs.writeFileSync(tempChangelogPath, existingContent, "utf-8");

    const { updated, content } = ChangelogGenerator.updateChangelogFile(
      tempChangelogPath,
      mockReleaseResult
    );
    expect(updated).toBe(true);
    expect(content).toContain("## [v1.1.0]");
    expect(content).toContain("## [v1.0.0] - 2026-01-01"); // Preserved prior version!
    expect(content).toContain("Initial release."); // Preserved prior details!
    expect(content).toContain("Add duplicate issue detection");
  });

  it("should create new CHANGELOG.md if file does not exist", () => {
    const { updated, content } = ChangelogGenerator.updateChangelogFile(
      tempChangelogPath,
      mockReleaseResult
    );
    expect(updated).toBe(true);
    expect(fs.existsSync(tempChangelogPath)).toBe(true);
    expect(content).toContain("# Changelog");
    expect(content).toContain("## [Unreleased]");
    expect(content).toContain("## [v1.1.0]");
  });
});
