import { describe, it, expect } from "vitest";
import { createCLI } from "../src/cli/index.js";

describe("CLI Program Configuration", () => {
  it("should configure all core commands and flags", () => {
    const cli = createCLI();
    const commandNames = cli.commands.map((cmd) => cmd.name());

    expect(commandNames).toContain("review-pr");
    expect(commandNames).toContain("triage");
    expect(commandNames).toContain("duplicate-check");
    expect(commandNames).toContain("release-notes");
    expect(commandNames).toContain("changelog");
    expect(commandNames).toContain("health");
  });

  it("should have correct version metadata", () => {
    const cli = createCLI();
    expect(cli.version()).toBe("0.1.0");
  });

  it("should enforce required arguments on review-pr command", () => {
    const cli = createCLI();
    const reviewCmd = cli.commands.find((c) => c.name() === "review-pr");
    expect(reviewCmd).toBeDefined();
    const prOption = reviewCmd?.options.find((opt) => opt.flags.includes("--pr"));
    expect(prOption?.required).toBe(true);
  });
});
