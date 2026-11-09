import { describe, it, expect } from "vitest";
import { redactSecrets, sanitizeMarkdown } from "../src/utils/sanitizer.js";

describe("Sanitizer Utilities", () => {
  it("should redact GitHub personal access tokens", () => {
    const raw = "Found token ghp_1234567890abcdefghijklmnopqrstuvwxyz in config";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("ghp_1234567890abcdefghijklmnopqrstuvwxyz");
    expect(redacted).toContain("[REDACTED]");
  });

  it("should redact OpenAI API keys", () => {
    const raw = "Authorization: Bearer sk-proj-1234567890abcdefghijk123456";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("sk-proj-1234567890abcdefghijk123456");
    expect(redacted).toContain("[REDACTED]");
  });

  it("should redact AWS access keys", () => {
    const raw = "export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(redacted).toContain("[REDACTED]");
  });

  it("should sanitize dangerous script and iframe tags in markdown", () => {
    const malicious =
      "Hello <script>alert('xss')</script> world <iframe src='http://bad.com'></iframe>";
    const clean = sanitizeMarkdown(malicious);
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert('xss')");
    expect(clean).not.toContain("<iframe");
    expect(clean).toContain("Hello  world");
  });

  it("should sanitize dangerous javascript: protocol in markdown links", () => {
    const malicious = "[Click here](javascript:stealData())";
    const clean = sanitizeMarkdown(malicious);
    expect(clean).not.toContain("javascript:stealData()");
    expect(clean).toContain("[Click here](#)");
  });
});
