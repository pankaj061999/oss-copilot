import { parseRepoString, GitHubClient } from "../github/client.js";
import { createAIProvider } from "../ai/provider.js";
import { DuplicateDetector } from "../analyzers/duplicate-detector.js";
import { loadConfig, getEnvironmentCredentials } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface DuplicateCheckCommandOptions {
  issue: string;
  threshold?: string;
  maxScan?: string;
  config?: string;
}

export async function duplicateCheckCommand(
  repoArg: string,
  options: DuplicateCheckCommandOptions
): Promise<void> {
  const issueNumber = parseInt(options.issue, 10);
  if (isNaN(issueNumber) || issueNumber <= 0) {
    logger.error("Invalid issue number specified. Example: --issue 123");
    process.exitCode = 1;
    return;
  }

  const threshold = options.threshold ? parseFloat(options.threshold) : undefined;
  const maxIssuesToScan = options.maxScan ? parseInt(options.maxScan, 10) : undefined;

  const repoRef = parseRepoString(repoArg);
  const config = loadConfig(options.config);
  const credentials = getEnvironmentCredentials();

  const github = new GitHubClient(credentials.githubToken);
  const ai = createAIProvider(config);

  const detector = new DuplicateDetector(github, ai, config);
  const { markdown } = await detector.checkDuplicates(repoRef, issueNumber, {
    similarityThreshold: threshold,
    maxIssuesToScan,
  });

  console.log("\n" + markdown + "\n");
}
