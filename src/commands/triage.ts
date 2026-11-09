import { parseRepoString, GitHubClient } from "../github/client.js";
import { createAIProvider } from "../ai/provider.js";
import { IssueTriageAnalyzer } from "../analyzers/issue-triage.js";
import { loadConfig, getEnvironmentCredentials } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface TriageCommandOptions {
  issue: string;
  comment?: boolean;
  applyLabels?: boolean;
  config?: string;
}

export async function triageCommand(repoArg: string, options: TriageCommandOptions): Promise<void> {
  const issueNumber = parseInt(options.issue, 10);
  if (isNaN(issueNumber) || issueNumber <= 0) {
    logger.error("Invalid issue number specified. Example: --issue 123");
    process.exitCode = 1;
    return;
  }

  const repoRef = parseRepoString(repoArg);
  const config = loadConfig(options.config);
  const credentials = getEnvironmentCredentials();

  const github = new GitHubClient(credentials.githubToken);
  const ai = createAIProvider(config);

  const analyzer = new IssueTriageAnalyzer(github, ai, config);
  const { result, markdown } = await analyzer.triage(repoRef, issueNumber);

  console.log("\n" + markdown + "\n");

  const shouldComment = options.comment ?? config.triage.postComment;
  if (shouldComment) {
    if (!github.isAuthenticated) {
      logger.warn("Cannot post triage comment: GITHUB_TOKEN environment variable not set.");
    } else {
      logger.info(`Posting suggested maintainer response to issue #${issueNumber}...`);
      await github.postComment(repoRef, issueNumber, result.maintainerResponse);
      logger.success("Triage response posted successfully!");
    }
  }

  const shouldApplyLabels = options.applyLabels ?? config.triage.applyLabels;
  if (shouldApplyLabels && result.suggestedLabels.length > 0) {
    if (!github.isAuthenticated) {
      logger.warn("Cannot apply labels: GITHUB_TOKEN environment variable not set.");
    } else {
      logger.info(`Applying labels: ${result.suggestedLabels.join(", ")}...`);
      await github.addLabels(repoRef, issueNumber, result.suggestedLabels);
      logger.success("Labels applied successfully!");
    }
  }
}
