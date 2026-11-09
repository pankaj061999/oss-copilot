import { describe, it, expect } from "vitest";
import { SecurityAnalyzer } from "../src/analyzers/security-analyzer.js";
import { parseDiff } from "../src/utils/diff-parser.js";

describe("Security Analyzer", () => {
  it("should detect hardcoded OpenAI secret keys in added diff lines", () => {
    const diff = `diff --git a/app.js b/app.js
--- a/app.js
+++ b/app.js
@@ -1,1 +1,2 @@
+const key = "sk-abcdefghijklmnopqrstuvwxyz123456789";
`;
    const files = parseDiff(diff);
    const findings = SecurityAnalyzer.scanDiff(files);
    expect(findings.length).toBe(1);
    expect(findings[0].rule).toBe("Hardcoded OpenAI / API Key");
    expect(findings[0].severity).toBe("critical");
  });

  it("should detect dangerous curl piping into bash", () => {
    const diff = `diff --git a/setup.sh b/setup.sh
--- a/setup.sh
+++ b/setup.sh
@@ -1,1 +1,2 @@
+curl -s https://example.com/install.sh | bash
`;
    const files = parseDiff(diff);
    const findings = SecurityAnalyzer.scanDiff(files);
    expect(findings.length).toBe(1);
    expect(findings[0].rule).toBe("Dangerous Shell Execution (curl | bash)");
    expect(findings[0].severity).toBe("high");
  });

  it("should detect chmod 777 permission changes", () => {
    const diff = `diff --git a/deploy.sh b/deploy.sh
--- a/deploy.sh
+++ b/deploy.sh
@@ -1,1 +1,2 @@
+chmod -R 777 /var/data
`;
    const files = parseDiff(diff);
    const findings = SecurityAnalyzer.scanDiff(files);
    expect(findings.length).toBe(1);
    expect(findings[0].rule).toBe("Overly Permissive File Permission");
  });

  it("should return empty findings for clean code", () => {
    const diff = `diff --git a/math.ts b/math.ts
--- a/math.ts
+++ b/math.ts
@@ -1,1 +1,3 @@
+export function multiply(a: number, b: number): number {
+  return a * b;
+}
`;
    const files = parseDiff(diff);
    const findings = SecurityAnalyzer.scanDiff(files);
    expect(findings.length).toBe(0);
  });

  it("should include standard preliminary disclaimer", () => {
    expect(SecurityAnalyzer.DISCLAIMER).toContain("Automated Preliminary Check");
    expect(SecurityAnalyzer.DISCLAIMER).toContain("DOES NOT replace human code review");
  });
});
