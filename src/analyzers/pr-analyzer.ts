import type { GitHubClient, GitHubRepoRef } from "../github/client.js";
import type { AIProvider } from "../types/ai.js";
import type { CopilotConfig } from "../types/config.js";
import { PRReviewResultSchema, type PRReviewResult, type PRFinding } from "../types/pr.js";
import { parseDiff, formatDiffForPrompt } from "../utils/diff-parser.js";
import { SecurityAnalyzer } from "./security-analyzer.js";
import { sanitizeMarkdown } from "../utils/sanitizer.js";
import { logger } from "../utils/logger.js";

export class PRAnalyzer {
  constructor(
    private github: GitHubClient,
    private ai: AIProvider,
    private config: CopilotConfig
  ) {}

  async analyze(
    ref: GitHubRepoRef,
    prNumber: number
  ): Promise<{
    result: PRReviewResult;
    markdown: string;
  }> {
    logger.info(`Fetching PR #${prNumber} on ${ref.owner}/${ref.repo}...`);
    const pr = await this.github.getPullRequest(ref, prNumber);
    const rawDiff = await this.github.getPullRequestDiff(ref, prNumber);

    const ignorePatterns = this.config.review.ignoreFiles;
    const parsedFiles = parseDiff(rawDiff, ignorePatterns);
    const maxDiffLength = this.config.review.maxDiffLength || 20000;
    const { formattedDiff, isTruncated, totalFiles } = formatDiffForPrompt(
      parsedFiles,
      maxDiffLength
    );

    logger.info(`Scanning diff across ${totalFiles} file(s)...`);
    const staticSecurityFindings = SecurityAnalyzer.scanDiff(parsedFiles);

    const systemPrompt = `You are OSS Copilot, an expert open-source maintainer and security reviewer.
Analyze pull requests with high technical precision.
Focus on:
1. Bugs, edge cases, and runtime exceptions.
2. Security concerns, injection risks, auth flaws, and improper data handling.
3. Performance regressions, leaks, unnecessary allocations, or N+1 queries.
4. Maintainability, clean code, naming, and architectural consistency.
5. Missing automated tests or edge cases that should have test coverage.

You must return a JSON object with this exact shape:
{
  "summary": "Short 2-3 sentence overview of what the PR accomplishes and general code quality.",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "type": "bug" | "security" | "performance" | "maintainability" | "style" | "test",
      "severity": "low" | "medium" | "high" | "critical",
      "message": "Specific explanation of the concern",
      "suggestion": "Concrete actionable code change or fix"
    }
  ],
  "suggestions": [
    "High level improvement recommendation"
  ],
  "testingRecommendations": [
    "Specific test case or edge scenario that should be covered"
  ],
  "securityNotes": "Optional security observation"
}`;

    const userPrompt = `Pull Request Title: ${pr.title}
Author: ${pr.user?.login || "unknown"}
Target Branch: ${pr.base.ref} <- Source Branch: ${pr.head.ref}
Description:
${pr.body || "No description provided."}

Files Changed: ${parsedFiles.map((f) => f.newPath || f.oldPath).join(", ")}
${isTruncated ? "\n(Note: Diff was truncated to fit review token budget)\n" : ""}
Diff:
${formattedDiff}`;

    logger.info("Generating AI code review...");
    const aiResult = await this.ai.generateStructured<PRReviewResult>(
      userPrompt,
      systemPrompt,
      (raw) => PRReviewResultSchema.parse(raw)
    );

    // Merge static security findings into findings if any were detected
    if (staticSecurityFindings.length > 0) {
      const additionalFindings: PRFinding[] = staticSecurityFindings.map((match) => ({
        file: match.file,
        line: match.line,
        type: "security",
        severity: match.severity,
        message: `[Static Security Rule: ${match.rule}] ${match.description}${match.snippet ? `\nCode snippet: \`${match.snippet}\`` : ""}`,
        suggestion: "Remove exposed secrets or verify security configuration before merging.",
      }));

      aiResult.findings = [...additionalFindings, ...aiResult.findings];
      // Elevate risk if high/critical static vulnerability was found
      if (staticSecurityFindings.some((f) => f.severity === "critical")) {
        aiResult.riskLevel = "critical";
      } else if (
        staticSecurityFindings.some((f) => f.severity === "high") &&
        aiResult.riskLevel === "low"
      ) {
        aiResult.riskLevel = "high";
      }
    }

    const markdown = this.renderMarkdown(pr.title, prNumber, aiResult);
    return { result: aiResult, markdown };
  }

  private renderMarkdown(prTitle: string, prNumber: number, result: PRReviewResult): string {
    const riskBadges: Record<string, string> = {
      low: "🟢 Low",
      medium: "🟡 Medium",
      high: "🟠 High",
      critical: "🔴 Critical",
    };

    let md = `## 🤖 OSS Copilot Pull Request Review: #${prNumber}\n\n`;
    md += `**PR:** ${prTitle}\n`;
    md += `**Overall Risk Level:** ${riskBadges[result.riskLevel] || result.riskLevel.toUpperCase()}\n\n`;
    md += `### 📋 Summary\n${result.summary}\n\n`;

    if (result.findings.length > 0) {
      md += `### 🔍 Detailed Findings\n\n`;
      md += `| File | Line | Type | Severity | Description & Suggestion |\n`;
      md += `| ---- | ---- | ---- | -------- | ------------------------ |\n`;
      for (const finding of result.findings) {
        const lineStr = finding.line ? String(finding.line) : "N/A";
        const desc = finding.suggestion
          ? `${finding.message}<br/>**Fix:** \`${finding.suggestion}\``
          : finding.message;
        md += `| \`${finding.file}\` | ${lineStr} | ${finding.type} | ${finding.severity} | ${desc.replace(/\|/g, "\\|")} |\n`;
      }
      md += `\n`;
    } else {
      md += `### 🔍 Detailed Findings\nNo critical bugs or regressions detected in this diff.\n\n`;
    }

    if (result.testingRecommendations.length > 0) {
      md += `### 🧪 Testing Recommendations\n`;
      for (const rec of result.testingRecommendations) {
        md += `- ${rec}\n`;
      }
      md += `\n`;
    }

    if (result.suggestions.length > 0) {
      md += `### 💡 Improvement Suggestions\n`;
      for (const sug of result.suggestions) {
        md += `- ${sug}\n`;
      }
      md += `\n`;
    }

    md += `> [!NOTE]\n`;
    md += `> ${SecurityAnalyzer.DISCLAIMER}\n\n`;
    md += `*Generated by [OSS Copilot](https://github.com/pankaj061999/oss-copilot) — Empowering open source maintainers.*`;

    return sanitizeMarkdown(md);
  }
}
