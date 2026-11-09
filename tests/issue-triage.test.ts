import { describe, it, expect, vi } from "vitest";
import { IssueTriageAnalyzer } from "../src/analyzers/issue-triage.js";
import type { GitHubClient } from "../src/github/client.js";
import type { AIProvider } from "../src/types/ai.js";
import { ConfigSchema } from "../src/types/config.js";
import type { IssueTriageResult } from "../src/types/issue.js";

describe("Issue Triage Analyzer", () => {
  const config = ConfigSchema.parse({});

  const mockTriageResult: IssueTriageResult = {
    type: "bug",
    priority: "high",
    severity: "high",
    suggestedLabels: ["bug", "priority/high"],
    summary: "Application throws unhandled TypeError on startup when config is missing.",
    maintainerResponse:
      "Thank you for reporting this issue! We are investigating the config loader.",
  };

  const mockGithub = {
    getIssue: vi.fn().mockResolvedValue({
      number: 10,
      title: "Crash on startup without config",
      user: { login: "alice" },
      state: "open",
      labels: [],
      body: "Running `oss-copilot` without `.oss-copilot.yml` causes TypeError.",
    }),
  } as unknown as GitHubClient;

  const mockAI = {
    name: "mock-ai",
    generateText: vi.fn(),
    generateStructured: vi.fn().mockResolvedValue(mockTriageResult),
  } as unknown as AIProvider;

  it("should triage issue and produce structured output with maintainer response", async () => {
    const analyzer = new IssueTriageAnalyzer(mockGithub, mockAI, config);
    const { result, markdown } = await analyzer.triage({ owner: "test", repo: "test-repo" }, 10);

    expect(result.type).toBe("bug");
    expect(result.priority).toBe("high");
    expect(result.suggestedLabels).toContain("bug");
    expect(markdown).toContain("OSS Copilot Issue Triage: #10");
    expect(markdown).toContain("Suggested Maintainer Response");
    expect(markdown).toContain("Thank you for reporting this issue!");
  });
});
