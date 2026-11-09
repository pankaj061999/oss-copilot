import type { GitHubClient, GitHubRepoRef } from "../github/client.js";
import type { AIProvider } from "../types/ai.js";
import type { CopilotConfig } from "../types/config.js";
import { DuplicateCheckResultSchema, type DuplicateCheckResult } from "../types/issue.js";
import { sanitizeMarkdown } from "../utils/sanitizer.js";
import { logger } from "../utils/logger.js";

export class DuplicateDetector {
  constructor(
    private github: GitHubClient,
    private ai: AIProvider,
    private config: CopilotConfig
  ) {}

  async checkDuplicates(
    ref: GitHubRepoRef,
    targetIssueNumber: number,
    options?: { similarityThreshold?: number; maxIssuesToScan?: number }
  ): Promise<{
    result: DuplicateCheckResult;
    markdown: string;
  }> {
    logger.info(`Fetching target issue #${targetIssueNumber}...`);
    const targetIssue = await this.github.getIssue(ref, targetIssueNumber);

    const maxScan = options?.maxIssuesToScan || this.config.duplicateCheck.maxIssuesToScan || 50;
    const threshold =
      options?.similarityThreshold ?? this.config.duplicateCheck.similarityThreshold ?? 0.75;

    logger.info(`Fetching recent issues from ${ref.owner}/${ref.repo} (limit: ${maxScan})...`);
    const recentIssues = await this.github.listRecentIssues(ref, { per_page: maxScan });

    // Exclude the target issue itself
    const candidateIssues = recentIssues
      .filter((i) => i.number !== targetIssueNumber)
      .slice(0, 30)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        excerpt: (i.body || "").slice(0, 200).replace(/\n/g, " "),
      }));

    if (candidateIssues.length === 0) {
      const emptyResult: DuplicateCheckResult = {
        isDuplicate: false,
        duplicateProbability: 0,
        matchingIssues: [],
        explanation: "No other issues found in the repository to compare against.",
      };
      return {
        result: emptyResult,
        markdown: this.renderMarkdown(targetIssue.title, targetIssueNumber, emptyResult),
      };
    }

    const systemPrompt = `You are OSS Copilot, an AI assistant specializing in semantic duplicate issue detection for open source repositories.
Analyze whether the target issue is an exact or near duplicate of any of the candidate issues.
Evaluate root cause similarity, error messages, requested feature scope, and symptoms.

Return a JSON object with this exact shape:
{
  "isDuplicate": boolean, // true if highest similarity is >= ${threshold}
  "duplicateProbability": number, // float 0.0 to 1.0 representing overall highest duplicate probability
  "matchingIssues": [
    {
      "issueNumber": 123,
      "title": "Title of existing issue",
      "similarityScore": 0.85, // float 0.0 to 1.0
      "reason": "Clear explanation of why this is a duplicate or shares root cause"
    }
  ],
  "explanation": "Summary paragraph explaining whether it is a duplicate and why."
}
If no duplicates are found, set isDuplicate to false, duplicateProbability to 0.0-0.2, and matchingIssues to an empty array.`;

    const userPrompt = `Target Issue #${targetIssueNumber}:
Title: ${targetIssue.title}
Body:
${targetIssue.body || "No description provided."}

Candidate Issues to Compare:
${candidateIssues
  .map((c) => `[#${c.number}] (${c.state}) "${c.title}"\nSnippet: ${c.excerpt}`)
  .join("\n\n")}`;

    logger.info("Comparing issues for semantic duplicates...");
    const result = await this.ai.generateStructured<DuplicateCheckResult>(
      userPrompt,
      systemPrompt,
      (raw) => DuplicateCheckResultSchema.parse(raw)
    );

    // Enforce threshold check
    result.isDuplicate = result.duplicateProbability >= threshold;

    const markdown = this.renderMarkdown(targetIssue.title, targetIssueNumber, result);
    return { result, markdown };
  }

  private renderMarkdown(
    targetTitle: string,
    issueNumber: number,
    result: DuplicateCheckResult
  ): string {
    const percentage = Math.round(result.duplicateProbability * 100);
    const badge = result.isDuplicate ? "⚠️ Likely Duplicate" : "✅ Unique Issue";

    let md = `## 🤖 OSS Copilot Duplicate Detection: #${issueNumber}\n\n`;
    md += `**Target Issue:** ${targetTitle}\n`;
    md += `**Status:** ${badge} (Match Confidence: ${percentage}%)\n\n`;
    md += `### 📝 Explanation\n${result.explanation}\n\n`;

    if (result.matchingIssues.length > 0) {
      md += `### 🔗 Potential Matching Issues\n\n`;
      md += `| Issue | Similarity | Reason |\n`;
      md += `| ----- | ---------- | ------ |\n`;
      for (const match of result.matchingIssues) {
        const score = Math.round(match.similarityScore * 100);
        md += `| #${match.issueNumber}: ${match.title.replace(/\|/g, "\\|")} | ${score}% | ${match.reason.replace(/\|/g, "\\|")} |\n`;
      }
      md += `\n`;
    }

    md += `*Note: Duplicate detection is powered by [OSS Copilot](https://github.com/pankaj061999/oss-copilot). Maintainers should verify before closing issues.*`;
    return sanitizeMarkdown(md);
  }
}
