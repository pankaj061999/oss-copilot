import fs from "node:fs";
import path from "node:path";
import { parseRepoString, GitHubClient } from "../github/client.js";
import { createAIProvider } from "../ai/provider.js";
import { ReleaseNotesGenerator } from "../analyzers/release-notes-generator.js";
import { loadConfig, getEnvironmentCredentials } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface ReleaseNotesCommandOptions {
  from?: string;
  to: string;
  output?: string;
  config?: string;
}

export async function releaseNotesCommand(
  repoArg: string,
  options: ReleaseNotesCommandOptions
): Promise<void> {
  if (!options.to) {
    logger.error("Missing required --to tag parameter. Example: --to v1.1.0");
    process.exitCode = 1;
    return;
  }

  const repoRef = parseRepoString(repoArg);
  const config = loadConfig(options.config);
  const credentials = getEnvironmentCredentials();

  const github = new GitHubClient(credentials.githubToken);
  const ai = createAIProvider(config);

  const generator = new ReleaseNotesGenerator(github, ai, config);
  const { markdown } = await generator.generate(repoRef, {
    fromTag: options.from,
    toTag: options.to,
  });

  if (options.output) {
    const outputPath = path.resolve(process.cwd(), options.output);
    fs.writeFileSync(outputPath, markdown, "utf-8");
    logger.success(`Release notes written to ${outputPath}`);
  } else {
    console.log("\n" + markdown + "\n");
  }
}
