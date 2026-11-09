import { describe, it, expect, vi } from "vitest";
import { PRAnalyzer } from "../src/analyzers/pr-analyzer.js";
import type { GitHubClient } from "../src/github/client.js";
import type { AIProvider } from "../src/types/ai.js";
import { ConfigSchema } from "../src/types/config.js";
import type { PRReviewResult } from "../src/types/pr.js";

describe("PR Analyzer", () => {
  const config = ConfigSchema.parse({});

  const mockReviewResult: PRReviewResult = {
    summary: "This PR introduces a user authentication helper.",
    riskLevel: "low",
    findings: [
      {
        file: "src/auth.ts",
        line: 12,
        type: "maintainability",
        severity: "low",
        message: "Consider extracting constant for session duration.",
        suggestion: "const SESSION_TTL = 3600;",
      },
    ],
    suggestions: ["Add unit tests for expired token handling."],
    testingRecommendations: ["Test login with empty password."],
  };

  const mockGithub = {
    getPullRequest: vi.fn().mockResolvedValue({
      title: "Add authentication helper",
      body: "Implements jwt verification",
      user: { login: "contributor" },
      base: { ref: "main" },
      head: { ref: "feature/auth" },
    }),
    getPullRequestDiff: vi.fn().mockResolvedValue(`diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,1 +1,5 @@
+export function login(user: string) {
+  return user;
+}
`),
  } as unknown as GitHubClient;

  const mockAI = {
    name: "mock-ai",
    generateText: vi.fn(),
    generateStructured: vi.fn().mockResolvedValue(mockReviewResult),
  } as unknown as AIProvider;

  it("should run analysis and return structured result and formatted markdown", async () => {
    const analyzer = new PRAnalyzer(mockGithub, mockAI, config);
    const { result, markdown } = await analyzer.analyze({ owner: "test", repo: "test-repo" }, 42);

    expect(result.riskLevel).toBe("low");
    expect(result.findings.length).toBe(1);
    expect(markdown).toContain("OSS Copilot Pull Request Review: #42");
    expect(markdown).toContain("This PR introduces a user authentication helper.");
    expect(markdown).toContain("Automated Preliminary Check");
  });

  it("should escalate risk level when static security check detects secret in diff", async () => {
    const mockGithubWithSecret = {
      getPullRequest: vi.fn().mockResolvedValue({
        title: "Leaked secret",
        body: "",
        base: { ref: "main" },
        head: { ref: "leak" },
      }),
      getPullRequestDiff: vi.fn().mockResolvedValue(`diff --git a/keys.js b/keys.js
--- a/keys.js
+++ b/keys.js
@@ -1,1 +1,2 @@
+const token = "ghp_111111111122222222223333333333444444";
`),
    } as unknown as GitHubClient;

    const analyzer = new PRAnalyzer(mockGithubWithSecret, mockAI, config);
    const { result, markdown } = await analyzer.analyze({ owner: "test", repo: "test-repo" }, 99);

    expect(result.riskLevel).toBe("critical");
    expect(result.findings.some((f) => f.type === "security")).toBe(true);
    expect(markdown).toContain("Static Security Rule");
  });
});
