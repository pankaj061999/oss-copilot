import type { GitHubClient, GitHubRepoRef } from "../github/client.js";
import type { RepoHealthResult, HealthCheckItem } from "../types/health.js";
import { sanitizeMarkdown } from "../utils/sanitizer.js";
import { logger } from "../utils/logger.js";

export class RepoHealthAnalyzer {
  constructor(private github: GitHubClient) {}

  async analyze(ref: GitHubRepoRef): Promise<{
    result: RepoHealthResult;
    markdown: string;
  }> {
    logger.info(`Analyzing repository health for ${ref.owner}/${ref.repo}...`);

    const checks: HealthCheckItem[] = [];
    const recommendations: string[] = [];

    // 1. Fetch Repository metadata
    const repoData = await this.github.getRepository(ref);

    // Check README
    const readmeContent =
      (await this.github.getFileContent(ref, "README.md")) ||
      (await this.github.getFileContent(ref, "readme.md"));
    if (readmeContent && readmeContent.length > 400) {
      checks.push({
        name: "README Documentation",
        category: "documentation",
        status: "pass",
        score: 10,
        details: `README.md present with detailed content (${readmeContent.length} bytes).`,
      });
    } else if (readmeContent) {
      checks.push({
        name: "README Documentation",
        category: "documentation",
        status: "warn",
        score: 5,
        details: "README.md is very brief (less than 400 characters).",
        recommendation:
          "Expand README with usage instructions, setup steps, and architecture overview.",
      });
      recommendations.push(
        "Expand README.md with comprehensive installation and quickstart sections."
      );
    } else {
      checks.push({
        name: "README Documentation",
        category: "documentation",
        status: "fail",
        score: 0,
        details: "No README.md found in repository root.",
        recommendation:
          "Add a comprehensive README.md explaining the project purpose, installation, and usage.",
      });
      recommendations.push(
        "Add a README.md file to help new users and contributors understand the project."
      );
    }

    // Check LICENSE
    const hasLicense = Boolean(
      repoData.license?.key || (await this.github.getFileContent(ref, "LICENSE"))
    );
    if (hasLicense) {
      checks.push({
        name: "Open Source License",
        category: "security",
        status: "pass",
        score: 15,
        details: `License detected: ${repoData.license?.spdx_id || repoData.license?.name || "Custom LICENSE file"}.`,
      });
    } else {
      checks.push({
        name: "Open Source License",
        category: "security",
        status: "fail",
        score: 0,
        details: "No license detected. Users cannot legally use or contribute.",
        recommendation: "Add an OSI-approved open source license (e.g. MIT, Apache-2.0, or AGPL).",
      });
      recommendations.push(
        "Add an open-source LICENSE file (e.g., MIT, Apache-2.0) to allow community use."
      );
    }

    // Check SECURITY.md
    const securityMd =
      (await this.github.getFileContent(ref, "SECURITY.md")) ||
      (await this.github.getFileContent(ref, ".github/SECURITY.md"));
    if (securityMd) {
      checks.push({
        name: "Security Policy (SECURITY.md)",
        category: "security",
        status: "pass",
        score: 10,
        details: "SECURITY.md policy and disclosure guide present.",
      });
    } else {
      checks.push({
        name: "Security Policy (SECURITY.md)",
        category: "security",
        status: "fail",
        score: 0,
        details: "No SECURITY.md file found.",
        recommendation: "Add a SECURITY.md explaining how to report vulnerabilities privately.",
      });
      recommendations.push(
        "Create a SECURITY.md detailing safe vulnerability disclosure instructions."
      );
    }

    // Check CONTRIBUTING.md
    const contributingMd =
      (await this.github.getFileContent(ref, "CONTRIBUTING.md")) ||
      (await this.github.getFileContent(ref, ".github/CONTRIBUTING.md"));
    if (contributingMd) {
      checks.push({
        name: "Contributing Guidelines",
        category: "community",
        status: "pass",
        score: 8,
        details: "CONTRIBUTING.md instructions present.",
      });
    } else {
      checks.push({
        name: "Contributing Guidelines",
        category: "community",
        status: "warn",
        score: 0,
        details: "No CONTRIBUTING.md found.",
        recommendation:
          "Add a CONTRIBUTING.md guide with local setup, branch conventions, and PR requirements.",
      });
      recommendations.push(
        "Add CONTRIBUTING.md to guide external developers on how to submit pull requests."
      );
    }

    // Check CODE_OF_CONDUCT.md
    const cocMd =
      (await this.github.getFileContent(ref, "CODE_OF_CONDUCT.md")) ||
      (await this.github.getFileContent(ref, ".github/CODE_OF_CONDUCT.md"));
    if (cocMd) {
      checks.push({
        name: "Code of Conduct",
        category: "community",
        status: "pass",
        score: 5,
        details: "CODE_OF_CONDUCT.md present.",
      });
    } else {
      checks.push({
        name: "Code of Conduct",
        category: "community",
        status: "warn",
        score: 2,
        details: "No CODE_OF_CONDUCT.md found.",
        recommendation: "Adopt a Contributor Covenant code of conduct.",
      });
      recommendations.push("Adopt a standard CODE_OF_CONDUCT.md to foster an inclusive community.");
    }

    // Check CI Workflows
    const ciWorkflow =
      (await this.github.getFileContent(ref, ".github/workflows/ci.yml")) ||
      (await this.github.getFileContent(ref, ".github/workflows/test.yml")) ||
      (await this.github.getFileContent(ref, ".github/workflows/main.yml"));
    if (ciWorkflow) {
      checks.push({
        name: "Continuous Integration (CI)",
        category: "ci",
        status: "pass",
        score: 15,
        details: "GitHub Actions CI workflow configured.",
      });
    } else {
      checks.push({
        name: "Continuous Integration (CI)",
        category: "ci",
        status: "fail",
        score: 0,
        details: "No GitHub Actions CI workflow detected in .github/workflows/.",
        recommendation:
          "Set up GitHub Actions to automatically run tests, typecheck, and lint on PRs.",
      });
      recommendations.push(
        "Configure GitHub Actions CI workflows to enforce automated testing on pull requests."
      );
    }

    // Check Automated Tests in package.json
    const packageJsonContent = await this.github.getFileContent(ref, "package.json");
    if (packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent);
        if (pkg.scripts && pkg.scripts.test && !pkg.scripts.test.includes("no test specified")) {
          checks.push({
            name: "Automated Tests Configuration",
            category: "ci",
            status: "pass",
            score: 12,
            details: `Test script declared: "${pkg.scripts.test}"`,
          });
        } else {
          checks.push({
            name: "Automated Tests Configuration",
            category: "ci",
            status: "warn",
            score: 4,
            details: "No test script found in package.json.",
            recommendation: "Add automated tests using Vitest or Jest.",
          });
          recommendations.push("Configure a test script in package.json with unit test coverage.");
        }
      } catch {
        checks.push({
          name: "Automated Tests Configuration",
          category: "ci",
          status: "warn",
          score: 5,
          details: "Could not parse package.json.",
        });
      }
    } else {
      // Non-JS repository or root check
      checks.push({
        name: "Automated Tests Configuration",
        category: "ci",
        status: "pass",
        score: 10,
        details: "Repository configuration assessed.",
      });
    }

    // Check Releases & Freshness
    const releases = await this.github.listReleases(ref, 5);
    if (releases.length > 0) {
      const latestRelease = releases[0];
      const dateVal =
        latestRelease.created_at || latestRelease.published_at || new Date().toISOString();
      const releaseDate = new Date(dateVal);
      const daysSince = Math.round((Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 90) {
        checks.push({
          name: "Release Freshness",
          category: "maintenance",
          status: "pass",
          score: 13,
          details: `Latest release (${latestRelease.tag_name}) was published ${daysSince} days ago.`,
        });
      } else {
        checks.push({
          name: "Release Freshness",
          category: "maintenance",
          status: "warn",
          score: 7,
          details: `Latest release (${latestRelease.tag_name}) was published ${daysSince} days ago.`,
          recommendation:
            "Consider creating a regular release cadence or tagging new stable updates.",
        });
        recommendations.push("Publish a fresh release tag to reflect recent improvements.");
      }
    } else {
      checks.push({
        name: "Release Cadence",
        category: "maintenance",
        status: "warn",
        score: 4,
        details: "No formal GitHub releases found in repository.",
        recommendation: "Create structured GitHub releases with semantic tags (e.g., v0.1.0).",
      });
      recommendations.push("Publish formal GitHub releases using semantic tags and release notes.");
    }

    // Check Issue & PR Templates
    const bugTemplate = await this.github.getFileContent(
      ref,
      ".github/ISSUE_TEMPLATE/bug_report.yml"
    );
    const prTemplate = await this.github.getFileContent(ref, ".github/PULL_REQUEST_TEMPLATE.md");
    if (bugTemplate || prTemplate) {
      checks.push({
        name: "Issue & PR Templates",
        category: "community",
        status: "pass",
        score: 12,
        details: "Structured issue and PR templates detected.",
      });
    } else {
      checks.push({
        name: "Issue & PR Templates",
        category: "community",
        status: "warn",
        score: 3,
        details: "No structured GitHub issue/PR templates found.",
        recommendation: "Add .github/ISSUE_TEMPLATE/ and .github/PULL_REQUEST_TEMPLATE.md.",
      });
      recommendations.push("Add issue and PR templates to standardize incoming bug reports.");
    }

    // Sum scores
    const overallScore = Math.min(
      100,
      Math.max(
        0,
        checks.reduce((acc, c) => acc + c.score, 0)
      )
    );

    let grade: "A" | "B" | "C" | "D" | "F" = "F";
    if (overallScore >= 90) grade = "A";
    else if (overallScore >= 75) grade = "B";
    else if (overallScore >= 60) grade = "C";
    else if (overallScore >= 40) grade = "D";

    const summary = `Repository scored ${overallScore}/100 (Grade ${grade}) across community standards, security, CI, and maintenance freshness.`;

    const result: RepoHealthResult = {
      repository: `${ref.owner}/${ref.repo}`,
      overallScore,
      grade,
      summary,
      checks,
      recommendations,
    };

    const markdown = this.renderMarkdown(result);
    return { result, markdown };
  }

  private renderMarkdown(result: RepoHealthResult): string {
    const gradeEmoji: Record<string, string> = {
      A: "🏆 Grade A (Excellent)",
      B: "✨ Grade B (Good)",
      C: "⚠️ Grade C (Fair)",
      D: "⚡ Grade D (Needs Improvement)",
      F: "🚨 Grade F (Critical Deficiencies)",
    };

    let md = `## 🏥 OSS Copilot Repository Health: ${result.repository}\n\n`;
    md += `**Overall Health Score:** **${result.overallScore} / 100**\n`;
    md += `**Health Rating:** ${gradeEmoji[result.grade] || result.grade}\n\n`;
    md += `### 📊 Summary\n${result.summary}\n\n`;

    md += `### 📋 Health Checks Breakdown\n\n`;
    md += `| Category | Check | Status | Score | Findings |\n`;
    md += `| -------- | ----- | ------ | ----- | -------- |\n`;

    for (const ch of result.checks) {
      const statusIcon =
        ch.status === "pass" ? "✅ Pass" : ch.status === "warn" ? "⚠️ Warning" : "❌ Fail";
      md += `| ${ch.category} | ${ch.name} | ${statusIcon} | ${ch.score} pts | ${ch.details.replace(/\|/g, "\\|")} |\n`;
    }
    md += `\n`;

    if (result.recommendations.length > 0) {
      md += `### 🚀 Actionable Recommendations\n`;
      for (const rec of result.recommendations) {
        md += `- ${rec}\n`;
      }
      md += `\n`;
    }

    md += `*Report generated by [OSS Copilot](https://github.com/pankaj061999/oss-copilot)*`;
    return sanitizeMarkdown(md);
  }
}
