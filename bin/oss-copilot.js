#!/usr/bin/env node

const { runCLI } = require("../dist/cli/index.js");
const { runGitHubAction } = require("../dist/workflows/index.js");

async function main() {
  if (process.env.GITHUB_ACTIONS === "true" && process.argv.length <= 2) {
    try {
      await runGitHubAction();
    } catch (err) {
      console.error("OSS Copilot Action Error:", err.message || err);
      process.exit(1);
    }
  } else {
    runCLI(process.argv);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});
