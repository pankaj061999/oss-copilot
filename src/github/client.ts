import { Octokit } from "@octokit/rest";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logger.js";
import { redactSecrets } from "../utils/sanitizer.js";

export interface GitHubRepoRef {
  owner: string;
  repo: string;
}

export function parseRepoString(repoStr: string): GitHubRepoRef {
  const parts = repoStr.trim().split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repository format "${repoStr}". Expected format: OWNER/REPO (e.g. facebook/react)`
    );
  }
  return { owner: parts[0], repo: parts[1] };
}

export class GitHubClient {
  private octokit: Octokit;
  public readonly isAuthenticated: boolean;

  constructor(token?: string) {
    this.isAuthenticated = Boolean(token);
    this.octokit = new Octokit({
      auth: token || undefined,
      userAgent: "oss-copilot/0.1.0",
      log: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    });
  }

  /**
   * Fetch repository metadata (stars, forks, open issues, default branch, etc.)
   */
  async getRepository(ref: GitHubRepoRef) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.repos.get({
          owner: ref.owner,
          repo: ref.repo,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch repo ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`);
      }
    });
  }

  /**
   * Fetch a single pull request by number
   */
  async getPullRequest(ref: GitHubRepoRef, pullNumber: number) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.pulls.get({
          owner: ref.owner,
          repo: ref.repo,
          pull_number: pullNumber,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to fetch PR #${pullNumber} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Fetch pull request unified diff as plain text
   */
  async getPullRequestDiff(ref: GitHubRepoRef, pullNumber: number): Promise<string> {
    return withRetry(async () => {
      try {
        const response = await this.octokit.pulls.get({
          owner: ref.owner,
          repo: ref.repo,
          pull_number: pullNumber,
          headers: {
            accept: "application/vnd.github.v3.diff",
          },
        });
        return typeof response.data === "string" ? response.data : String(response.data);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to fetch diff for PR #${pullNumber} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * List files changed in a pull request
   */
  async getPullRequestFiles(ref: GitHubRepoRef, pullNumber: number) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.pulls.listFiles({
          owner: ref.owner,
          repo: ref.repo,
          pull_number: pullNumber,
          per_page: 100,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to list files for PR #${pullNumber} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Post a markdown comment to a PR or Issue
   */
  async postComment(ref: GitHubRepoRef, issueNumber: number, body: string) {
    if (!this.isAuthenticated) {
      logger.warn("Skipping comment post: GitHub token not provided.");
      return null;
    }
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.issues.createComment({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: issueNumber,
          body,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to post comment to #${issueNumber} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Fetch a single issue
   */
  async getIssue(ref: GitHubRepoRef, issueNumber: number) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.issues.get({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: issueNumber,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to fetch issue #${issueNumber} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * List recent issues (excluding pull requests)
   */
  async listRecentIssues(
    ref: GitHubRepoRef,
    options: { state?: "open" | "closed" | "all"; per_page?: number } = {}
  ) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.issues.listForRepo({
          owner: ref.owner,
          repo: ref.repo,
          state: options.state || "all",
          sort: "updated",
          direction: "desc",
          per_page: options.per_page || 50,
        });
        // Filter out pull requests as GitHub issues API includes PRs
        return data.filter((item) => !item.pull_request);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to list issues for ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Add labels to an issue or pull request
   */
  async addLabels(ref: GitHubRepoRef, issueNumber: number, labels: string[]) {
    if (!this.isAuthenticated) {
      logger.warn("Skipping label addition: GitHub token not provided.");
      return null;
    }
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.issues.addLabels({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: issueNumber,
          labels,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to add labels to #${issueNumber} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Compare two commits or tags to get list of commits and files
   */
  async compareCommits(ref: GitHubRepoRef, base: string, head: string) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.repos.compareCommitsWithBasehead({
          owner: ref.owner,
          repo: ref.repo,
          basehead: `${base}...${head}`,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to compare ${base}...${head} on ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Check if a file exists in the repository root or .github directory
   */
  async getFileContent(ref: GitHubRepoRef, filePath: string): Promise<string | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: ref.owner,
        repo: ref.repo,
        path: filePath,
      });
      const data = response.data as { content?: string; encoding?: string } | null;
      if (data && data.content && data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch recent releases
   */
  async listReleases(ref: GitHubRepoRef, perPage = 10) {
    return withRetry(async () => {
      try {
        const { data } = await this.octokit.repos.listReleases({
          owner: ref.owner,
          repo: ref.repo,
          per_page: perPage,
        });
        return data;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to list releases for ${ref.owner}/${ref.repo}: ${redactSecrets(msg)}`
        );
      }
    });
  }

  /**
   * Check rate limits
   */
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rateLimit.get();
      return data.rate;
    } catch {
      return null;
    }
  }
}
