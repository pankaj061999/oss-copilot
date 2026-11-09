import { describe, it, expect, vi } from "vitest";
import { DuplicateDetector } from "../src/analyzers/duplicate-detector.js";
import type { GitHubClient } from "../src/github/client.js";
import type { AIProvider } from "../src/types/ai.js";
import { ConfigSchema } from "../src/types/config.js";
import type { DuplicateCheckResult } from "../src/types/issue.js";

describe("Duplicate Detector", () => {
  const config = ConfigSchema.parse({});

  const mockDuplicateResult: DuplicateCheckResult = {
    isDuplicate: true,
    duplicateProbability: 0.92,
    matchingIssues: [
      {
        issueNumber: 5,
        title: "CLI crashes on empty repository argument",
        similarityScore: 0.95,
        reason: "Both issues describe the exact same uncaught CLI parameter error.",
      },
    ],
    explanation: "This issue reports the identical crash behavior as issue #5.",
  };

  const mockGithub = {
    getIssue: vi.fn().mockResolvedValue({
      number: 8,
      title: "Crash when running cli without repo name",
      body: "Running `oss-copilot review-pr` without arguments fails abruptly.",
    }),
    listRecentIssues: vi.fn().mockResolvedValue([
      {
        number: 5,
        title: "CLI crashes on empty repository argument",
        state: "open",
        body: "Missing argument error is unhandled.",
      },
      {
        number: 8,
        title: "Crash when running cli without repo name",
        state: "open",
        body: "Self issue",
      },
    ]),
  } as unknown as GitHubClient;

  const mockAI = {
    name: "mock-ai",
    generateText: vi.fn(),
    generateStructured: vi.fn().mockResolvedValue(mockDuplicateResult),
  } as unknown as AIProvider;

  it("should detect duplicate issues with confidence matching threshold", async () => {
    const detector = new DuplicateDetector(mockGithub, mockAI, config);
    const { result, markdown } = await detector.checkDuplicates(
      { owner: "test", repo: "test-repo" },
      8
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateProbability).toBe(0.92);
    expect(result.matchingIssues[0].issueNumber).toBe(5);
    expect(markdown).toContain("Likely Duplicate");
    expect(markdown).toContain("#5");
  });

  it("should handle repositories with no previous issues gracefully", async () => {
    const mockEmptyGithub = {
      getIssue: vi.fn().mockResolvedValue({
        number: 1,
        title: "First issue ever",
        body: "First",
      }),
      listRecentIssues: vi.fn().mockResolvedValue([]),
    } as unknown as GitHubClient;

    const detector = new DuplicateDetector(mockEmptyGithub, mockAI, config);
    const { result, markdown } = await detector.checkDuplicates(
      { owner: "test", repo: "test-repo" },
      1
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.matchingIssues.length).toBe(0);
    expect(markdown).toContain("Unique Issue");
  });
});
