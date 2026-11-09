import { Command } from "commander";
import { reviewPRCommand } from "../commands/review-pr.js";
import { triageCommand } from "../commands/triage.js";
import { duplicateCheckCommand } from "../commands/duplicate-check.js";
import { releaseNotesCommand } from "../commands/release-notes.js";
import { changelogCommand } from "../commands/changelog.js";
import { healthCommand } from "../commands/health.js";
import { logger } from "../utils/logger.js";

const VERSION = "0.1.0";

export function createCLI(): Command {
  const program = new Command();

  program
    .name("oss-copilot")
    .description(
      "AI-powered toolkit for GitHub code reviews, issue triage, and open-source maintenance."
    )
    .version(VERSION, "-v, --version", "Output the current version of oss-copilot");

  program
    .command("review-pr")
    .description(
      "Analyze a pull request for bugs, security concerns, performance, and missing tests"
    )
    .argument("<repo>", "GitHub repository in OWNER/REPO format (e.g. facebook/react)")
    .requiredOption("-p, --pr <number>", "Pull request number to review")
    .option("-c, --comment", "Post the generated review as a GitHub PR comment")
    .option(
      "--fail-on-risk",
      "Fail command with non-zero exit code if high/critical risk is detected"
    )
    .option("--config <path>", "Path to custom .oss-copilot.yml configuration file")
    .action(async (repo: string, options) => {
      try {
        await reviewPRCommand(repo, options);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        process.exit(1);
      }
    });

  program
    .command("triage")
    .description(
      "Classify an issue, prioritize, suggest labels, and generate a maintainer response"
    )
    .argument("<repo>", "GitHub repository in OWNER/REPO format (e.g. facebook/react)")
    .requiredOption("-i, --issue <number>", "Issue number to triage")
    .option("-c, --comment", "Post the recommended response as a comment on the issue")
    .option("-l, --apply-labels", "Apply the suggested labels to the GitHub issue")
    .option("--config <path>", "Path to custom .oss-copilot.yml configuration file")
    .action(async (repo: string, options) => {
      try {
        await triageCommand(repo, options);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        process.exit(1);
      }
    });

  program
    .command("duplicate-check")
    .description(
      "Detect potential duplicates for an issue by comparing against recent repository issues"
    )
    .argument("<repo>", "GitHub repository in OWNER/REPO format (e.g. facebook/react)")
    .requiredOption("-i, --issue <number>", "Issue number to check for duplicates")
    .option("-t, --threshold <score>", "Similarity threshold float between 0 and 1 (default: 0.75)")
    .option(
      "-s, --max-scan <number>",
      "Maximum number of recent issues to compare against (default: 50)"
    )
    .option("--config <path>", "Path to custom .oss-copilot.yml configuration file")
    .action(async (repo: string, options) => {
      try {
        await duplicateCheckCommand(repo, options);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        process.exit(1);
      }
    });

  program
    .command("release-notes")
    .description(
      "Generate structured release notes categorized by Features, Fixes, Breaking Changes, etc."
    )
    .argument("<repo>", "GitHub repository in OWNER/REPO format (e.g. facebook/react)")
    .requiredOption("-t, --to <tag>", "Target release tag (e.g. v1.1.0)")
    .option("-f, --from <tag>", "Base release tag to compare from (e.g. v1.0.0)")
    .option("-o, --output <file>", "Save release notes to a markdown file")
    .option("--config <path>", "Path to custom .oss-copilot.yml configuration file")
    .action(async (repo: string, options) => {
      try {
        await releaseNotesCommand(repo, options);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        process.exit(1);
      }
    });

  program
    .command("changelog")
    .description("Generate and update CHANGELOG.md without destroying existing history")
    .argument("<repo>", "GitHub repository in OWNER/REPO format (e.g. facebook/react)")
    .requiredOption("-t, --to <tag>", "Target release tag (e.g. v1.1.0)")
    .option("-f, --from <tag>", "Base release tag to compare from (e.g. v1.0.0)")
    .option("--file <path>", "Path to CHANGELOG file (default: CHANGELOG.md)")
    .option("--config <path>", "Path to custom .oss-copilot.yml configuration file")
    .action(async (repo: string, options) => {
      try {
        await changelogCommand(repo, options);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        process.exit(1);
      }
    });

  program
    .command("health")
    .description(
      "Audit repository health, community standards, CI, and maintenance freshness (0-100)"
    )
    .argument("<repo>", "GitHub repository in OWNER/REPO format (e.g. facebook/react)")
    .option("--min-score <number>", "Fail command if health score is below minimum threshold")
    .option("--config <path>", "Path to custom .oss-copilot.yml configuration file")
    .action(async (repo: string, options) => {
      try {
        await healthCommand(repo, options);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        process.exit(1);
      }
    });

  return program;
}

export function runCLI(args: string[] = process.argv): void {
  const cli = createCLI();
  cli.parse(args);
}
