import { parseRepoString, GitHubClient } from "../github/client.js";
import { createAIProvider } from "../ai/provider.js";
import { PRAnalyzer } from "../analyzers/pr-analyzer.js";
import { loadConfig, getEnvironmentCredentials } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface ReviewPRCommandOptions {
  pr: string;
  comment?: boolean;
  failOnRisk?: boolean;
  config?: string;
}

export async function reviewPRCommand(
  repoArg: string,
  options: ReviewPRCommandOptions
): Promise<void> {
  const prNumber = parseInt(options.pr, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    logger.error("Invalid PR number specified. Example: --pr 123");
    process.exitCode = 1;
    return;
  }

  const repoRef = parseRepoString(repoArg);
  const config = loadConfig(options.config);
  const credentials = getEnvironmentCredentials();

  const github = new GitHubClient(credentials.githubToken);
  const ai = createAIProvider(config);

  const analyzer = new PRAnalyzer(github, ai, config);
  const { result, markdown } = await analyzer.analyze(repoRef, prNumber);

  // Print review markdown to stdout
  console.log("\n" + markdown + "\n");

  const shouldComment = options.comment ?? config.review.postComment;
  if (shouldComment) {
    if (!github.isAuthenticated) {
      logger.warn("Cannot post review comment: GITHUB_TOKEN environment variable not set.");
    } else {
      logger.info(`Posting review comment to PR #${prNumber}...`);
      await github.postComment(repoRef, prNumber, markdown);
      logger.success("Review comment successfully posted!");
    }
  }

  const shouldFailOnRisk = options.failOnRisk ?? config.security.failOnHighRisk;
  if (shouldFailOnRisk && (result.riskLevel === "high" || result.riskLevel === "critical")) {
    logger.error(`PR rejected: Risk level assessed as "${result.riskLevel.toUpperCase()}".`);
    process.exitCode = 2;
  }
}
