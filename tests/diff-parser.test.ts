import { describe, it, expect } from "vitest";
import { parseDiff, formatDiffForPrompt } from "../src/utils/diff-parser.js";

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index e69de29..d95f3ad 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
+console.log("hello world");
+export const sum = (a: number, b: number) => a + b;
-console.log("old");
diff --git a/package-lock.json b/package-lock.json
index 1111111..2222222 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,2 +1,3 @@
+ "lockfileVersion": 3,
`;

describe("Diff Parser", () => {
  it("should parse files and hunks accurately", () => {
    const files = parseDiff(SAMPLE_DIFF);
    expect(files.length).toBe(2);
    expect(files[0].newPath).toBe("src/index.ts");
    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(1);
  });

  it("should ignore files matching ignore patterns", () => {
    const files = parseDiff(SAMPLE_DIFF, ["package-lock.json"]);
    expect(files.length).toBe(1);
    expect(files[0].newPath).toBe("src/index.ts");
  });

  it("should format diff and respect maxLength truncation", () => {
    const files = parseDiff(SAMPLE_DIFF);
    const { formattedDiff, isTruncated } = formatDiffForPrompt(files, 50);
    expect(isTruncated).toBe(true);
    expect(formattedDiff.length).toBeLessThanOrEqual(200);
  });
});
