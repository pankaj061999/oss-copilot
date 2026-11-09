import { describe, it, expect, vi } from "vitest";
import { RepoHealthAnalyzer } from "../src/analyzers/repo-health.js";
import type { GitHubClient } from "../src/github/client.js";

describe("Repository Health Analyzer", () => {
  it("should calculate health score and assign Grade A for fully compliant repo", async () => {
    const mockGithub = {
      getRepository: vi.fn().mockResolvedValue({
        name: "oss-copilot",
        license: { spdx_id: "MIT", key: "mit" },
      }),
      getFileContent: vi.fn().mockImplementation((_ref, filePath) => {
        if (filePath === "README.md") return Promise.resolve("# Project\n".repeat(40));
        if (filePath === "SECURITY.md") return Promise.resolve("# Security Policy");
        if (filePath === "CONTRIBUTING.md") return Promise.resolve("# Contributing");
        if (filePath === "CODE_OF_CONDUCT.md") return Promise.resolve("# Code of Conduct");
        if (filePath === ".github/workflows/ci.yml") return Promise.resolve("name: CI");
        if (filePath === "package.json")
          return Promise.resolve(JSON.stringify({ scripts: { test: "vitest" } }));
        if (filePath === ".github/ISSUE_TEMPLATE/bug_report.yml")
          return Promise.resolve("name: Bug");
        return Promise.resolve(null);
      }),
      listReleases: vi.fn().mockResolvedValue([
        {
          tag_name: "v1.0.0",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]),
    } as unknown as GitHubClient;

    const analyzer = new RepoHealthAnalyzer(mockGithub);
    const { result, markdown } = await analyzer.analyze({ owner: "test", repo: "test-repo" });

    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
    expect(markdown).toContain("Grade A (Excellent)");
    expect(markdown).toContain("README Documentation");
    expect(markdown).toContain("Open Source License");
  });

  it("should identify missing security and community files with actionable recommendations", async () => {
    const mockMinimalGithub = {
      getRepository: vi.fn().mockResolvedValue({
        name: "empty-repo",
        license: null,
      }),
      getFileContent: vi.fn().mockResolvedValue(null),
      listReleases: vi.fn().mockResolvedValue([]),
    } as unknown as GitHubClient;

    const analyzer = new RepoHealthAnalyzer(mockMinimalGithub);
    const { result, markdown } = await analyzer.analyze({ owner: "test", repo: "minimal-repo" });

    expect(result.overallScore).toBeLessThan(40);
    expect(result.grade).toBe("F");
    expect(result.recommendations.length).toBeGreaterThan(3);
    expect(markdown).toContain("Add an open-source LICENSE file");
    expect(markdown).toContain("Create a SECURITY.md");
  });
});
