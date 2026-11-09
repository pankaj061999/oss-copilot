import { parseRepoString, GitHubClient } from "../github/client.js";
import { createAIProvider } from "../ai/provider.js";
import { ReleaseNotesGenerator } from "../analyzers/release-notes-generator.js";
import { ChangelogGenerator } from "../analyzers/changelog-generator.js";
import { loadConfig, getEnvironmentCredentials } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface ChangelogCommandOptions {
  from?: string;
  to: string;
  file?: string;
  config?: string;
}

export async function changelogCommand(
  repoArg: string,
  options: ChangelogCommandOptions
): Promise<void> {
  if (!options.to) {
    logger.error("Missing required --to tag parameter. Example: --to v1.1.0");
    process.exitCode = 1;
    return;
  }

  const targetFile = options.file || "CHANGELOG.md";
  const repoRef = parseRepoString(repoArg);
  const config = loadConfig(options.config);
  const credentials = getEnvironmentCredentials();

  const github = new GitHubClient(credentials.githubToken);
  const ai = createAIProvider(config);

  const generator = new ReleaseNotesGenerator(github, ai, config);
  const { result } = await generator.generate(repoRef, {
    fromTag: options.from,
    toTag: options.to,
  });

  const { updated } = ChangelogGenerator.updateChangelogFile(targetFile, result);
  if (updated) {
    logger.success(`Successfully updated ${targetFile} for release ${options.to}!`);
  }
}
