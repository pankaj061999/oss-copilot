import type { GitHubClient, GitHubRepoRef } from "../github/client.js";
import type { AIProvider } from "../types/ai.js";
import type { CopilotConfig } from "../types/config.js";
import {
  ReleaseNotesResultSchema,
  type ReleaseNotesResult,
  type ReleaseNotesOptions,
} from "../types/release.js";
import { sanitizeMarkdown } from "../utils/sanitizer.js";
import { logger } from "../utils/logger.js";

export class ReleaseNotesGenerator {
  constructor(
    private github: GitHubClient,
    private ai: AIProvider,
    public readonly config: CopilotConfig
  ) {}

  async generate(
    ref: GitHubRepoRef,
    options: ReleaseNotesOptions
  ): Promise<{
    result: ReleaseNotesResult;
    markdown: string;
  }> {
    const { fromTag, toTag } = options;
    logger.info(
      `Comparing ${fromTag ? `${fromTag}...` : ""}${toTag} on ${ref.owner}/${ref.repo}...`
    );

    let commitMessages: string[] = [];
    const contributors = new Set<string>();

    if (fromTag) {
      const comparison = await this.github.compareCommits(ref, fromTag, toTag);
      commitMessages = (comparison.commits || []).map(
        (c: { author?: { login?: string } | null; commit: { message?: string }; sha: string }) => {
          if (c.author?.login) contributors.add(c.author.login);
          const msgFirstLine = (c.commit.message || "").split("\n")[0];
          return `- ${msgFirstLine} (${c.sha.slice(0, 7)})`;
        }
      );
    } else {
      // If no fromTag provided, fetch recent releases or commits for context
      const releases = await this.github.listReleases(ref, 2);
      if (releases.length > 0) {
        commitMessages = [`Release ${toTag} updates`];
      }
    }

    if (commitMessages.length === 0) {
      commitMessages = [`Initial or baseline release for ${toTag}`];
    }

    const systemPrompt = `You are OSS Copilot, generating professional, publication-ready GitHub release notes.
Categorize the commit changes and PR items into these exact groups:
- features: Array of user-facing new capabilities or enhancements
- bugFixes: Array of bug fixes and error resolutions
- performance: Array of performance and efficiency improvements
- security: Array of security patches or vulnerability fixes
- documentation: Array of documentation and guide additions
- breakingChanges: Array of breaking API or configuration changes

Output a JSON object with this exact shape:
{
  "version": "${toTag}",
  "fromTag": "${fromTag || ""}",
  "toTag": "${toTag}",
  "summary": "High-level 2-sentence summary of this release highlights.",
  "groups": {
    "features": ["Item 1", "Item 2"],
    "bugFixes": ["Fix 1"],
    "performance": [],
    "security": [],
    "documentation": [],
    "breakingChanges": []
  },
  "contributors": ["user1", "user2"]
}`;

    const userPrompt = `Repository: ${ref.owner}/${ref.repo}
From Tag: ${fromTag || "Initial"}
To Tag: ${toTag}
Known Contributors: ${Array.from(contributors).join(", ") || "none"}

Commits & PRs in this range:
${commitMessages.slice(0, 100).join("\n")}`;

    logger.info("Generating grouped release notes with AI...");
    const result = await this.ai.generateStructured<ReleaseNotesResult>(
      userPrompt,
      systemPrompt,
      (raw) => ReleaseNotesResultSchema.parse(raw)
    );

    // Merge detected contributors
    for (const c of contributors) {
      if (!result.contributors.includes(c)) {
        result.contributors.push(c);
      }
    }

    const markdown = this.renderMarkdown(ref, result);
    return { result, markdown };
  }

  private renderMarkdown(ref: GitHubRepoRef, result: ReleaseNotesResult): string {
    let md = `## Release ${result.toTag}\n\n`;
    if (result.fromTag) {
      md += `*Changes between [${result.fromTag}](https://github.com/${ref.owner}/${ref.repo}/tree/${result.fromTag}) and [${result.toTag}](https://github.com/${ref.owner}/${ref.repo}/tree/${result.toTag})*\n\n`;
    }
    md += `### 🌟 Highlights\n${result.summary}\n\n`;

    const g = result.groups;

    if (g.breakingChanges && g.breakingChanges.length > 0) {
      md += `### ⚠️ Breaking Changes\n`;
      for (const item of g.breakingChanges) md += `- ${item}\n`;
      md += `\n`;
    }

    if (g.features && g.features.length > 0) {
      md += `### ✨ Features\n`;
      for (const item of g.features) md += `- ${item}\n`;
      md += `\n`;
    }

    if (g.bugFixes && g.bugFixes.length > 0) {
      md += `### 🐛 Bug Fixes\n`;
      for (const item of g.bugFixes) md += `- ${item}\n`;
      md += `\n`;
    }

    if (g.performance && g.performance.length > 0) {
      md += `### ⚡ Performance\n`;
      for (const item of g.performance) md += `- ${item}\n`;
      md += `\n`;
    }

    if (g.security && g.security.length > 0) {
      md += `### 🔒 Security\n`;
      for (const item of g.security) md += `- ${item}\n`;
      md += `\n`;
    }

    if (g.documentation && g.documentation.length > 0) {
      md += `### 📚 Documentation\n`;
      for (const item of g.documentation) md += `- ${item}\n`;
      md += `\n`;
    }

    if (result.contributors && result.contributors.length > 0) {
      md += `### 👥 Contributors\n`;
      md += `Special thanks to: ` + result.contributors.map((c) => `@${c}`).join(", ") + `\n\n`;
    }

    md += `---\n*Generated by [OSS Copilot](https://github.com/pankaj061999/oss-copilot)*`;
    return sanitizeMarkdown(md);
  }
}
