import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../src/types/config.js";
import { loadConfig } from "../src/config/index.js";

describe("Configuration", () => {
  it("should apply default configuration values", () => {
    const config = ConfigSchema.parse({});
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.review.enabled).toBe(true);
    expect(config.review.postComment).toBe(false);
    expect(config.review.maxDiffLength).toBe(20000);
    expect(config.duplicateCheck.similarityThreshold).toBe(0.75);
    expect(config.security.enabled).toBe(true);
  });

  it("should validate and override partial configurations", () => {
    const custom = {
      model: "gpt-4o",
      review: {
        postComment: true,
        maxDiffLength: 15000,
      },
      duplicateCheck: {
        similarityThreshold: 0.85,
      },
    };

    const parsed = ConfigSchema.parse(custom);
    expect(parsed.model).toBe("gpt-4o");
    expect(parsed.review.postComment).toBe(true);
    expect(parsed.review.maxDiffLength).toBe(15000);
    expect(parsed.duplicateCheck.similarityThreshold).toBe(0.85);
    // defaults preserved for unspecified fields
    expect(parsed.review.enabled).toBe(true);
    expect(parsed.security.enabled).toBe(true);
  });

  it("should reject invalid similarity threshold outside 0..1", () => {
    const invalid = {
      duplicateCheck: {
        similarityThreshold: 1.5,
      },
    };
    const res = ConfigSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("should load config safely and fallback to defaults when path is missing", () => {
    const config = loadConfig("non-existent-file.yml");
    expect(config.provider).toBe("openai");
  });
});
