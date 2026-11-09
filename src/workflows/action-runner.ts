import fs from "node:fs";
import { reviewPRCommand } from "../commands/review-pr.js";
import { triageCommand } from "../commands/triage.js";
import { duplicateCheckCommand } from "../commands/duplicate-check.js";
import { logger } from "../utils/logger.js";

export async function runGitHubAction(): Promise<void> {
  const repository = process.env.GITHUB_REPOSITORY;
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!repository) {
    throw new Error("Missing GITHUB_REPOSITORY environment variable.");
  }

  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error(`GITHUB_EVENT_PATH does not exist: ${eventPath}`);
  }

  logger.info(`Running OSS Copilot Action for event: ${eventName} on ${repository}`);
  const eventPayload = JSON.parse(fs.readFileSync(eventPath, "utf-8"));

  if (eventName === "pull_request" || eventName === "pull_request_target") {
    const prNumber = eventPayload.pull_request?.number;
    if (!prNumber) {
      throw new Error("Unable to determine pull request number from GitHub Action event payload.");
    }

    logger.info(`Triggering automated PR review for PR #${prNumber}...`);
    await reviewPRCommand(repository, {
      pr: String(prNumber),
      comment: true,
    });
    logger.success("Automated PR review completed successfully.");
    return;
  }

  if (eventName === "issues") {
    const action = eventPayload.action;
    const issueNumber = eventPayload.issue?.number;
    if (!issueNumber) {
      throw new Error("Unable to determine issue number from GitHub Action event payload.");
    }

    if (action === "opened" || action === "reopened") {
      logger.info(`Running automated triage & duplicate check for issue #${issueNumber}...`);
      await duplicateCheckCommand(repository, {
        issue: String(issueNumber),
      });
      await triageCommand(repository, {
        issue: String(issueNumber),
        comment: false,
      });
      logger.success("Automated issue triage completed successfully.");
      return;
    }
  }

  logger.warn(`Event ${eventName} does not require automated OSS Copilot processing.`);
}
