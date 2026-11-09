import { parseRepoString, GitHubClient } from "../github/client.js";
import { RepoHealthAnalyzer } from "../analyzers/repo-health.js";
import { getEnvironmentCredentials } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface HealthCommandOptions {
  config?: string;
  minScore?: string;
}

export async function healthCommand(repoArg: string, options: HealthCommandOptions): Promise<void> {
  const repoRef = parseRepoString(repoArg);
  const credentials = getEnvironmentCredentials();

  const github = new GitHubClient(credentials.githubToken);
  const analyzer = new RepoHealthAnalyzer(github);

  const { result, markdown } = await analyzer.analyze(repoRef);

  console.log("\n" + markdown + "\n");

  if (options.minScore) {
    const min = parseInt(options.minScore, 10);
    if (!isNaN(min) && result.overallScore < min) {
      logger.error(
        `Repository health score (${result.overallScore}) is below required minimum threshold (${min}).`
      );
      process.exitCode = 1;
    }
  }
}
