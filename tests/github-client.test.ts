import { describe, it, expect } from "vitest";
import { parseRepoString, GitHubClient } from "../src/github/client.js";

describe("GitHub Client", () => {
  it("should parse valid OWNER/REPO strings correctly", () => {
    const ref = parseRepoString("pankaj061999/oss-copilot");
    expect(ref.owner).toBe("pankaj061999");
    expect(ref.repo).toBe("oss-copilot");
  });

  it("should throw error on invalid repository strings", () => {
    expect(() => parseRepoString("invalid-repo")).toThrow("Invalid repository format");
    expect(() => parseRepoString("a/b/c")).toThrow("Invalid repository format");
    expect(() => parseRepoString("")).toThrow("Invalid repository format");
  });

  it("should initialize client without token and report unauthenticated", () => {
    const client = new GitHubClient();
    expect(client.isAuthenticated).toBe(false);
  });

  it("should initialize client with token and report authenticated", () => {
    const client = new GitHubClient("dummy_token");
    expect(client.isAuthenticated).toBe(true);
  });
});
