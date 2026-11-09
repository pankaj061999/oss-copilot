import { z } from "zod";

export const ConfigSchema = z.object({
  provider: z.enum(["openai"]).default("openai"),
  model: z.string().default("gpt-4o-mini"),
  review: z
    .object({
      enabled: z.boolean().default(true),
      postComment: z.boolean().default(false),
      maxDiffLength: z.number().default(20000),
      ignoreFiles: z
        .array(z.string())
        .default([
          "*.min.js",
          "*.lock",
          "package-lock.json",
          "yarn.lock",
          "pnpm-lock.yaml",
          "*.svg",
        ]),
    })
    .default({}),
  triage: z
    .object({
      enabled: z.boolean().default(true),
      postComment: z.boolean().default(false),
      applyLabels: z.boolean().default(false),
    })
    .default({}),
  security: z
    .object({
      enabled: z.boolean().default(true),
      failOnHighRisk: z.boolean().default(false),
    })
    .default({}),
  duplicateCheck: z
    .object({
      enabled: z.boolean().default(true),
      similarityThreshold: z.number().min(0).max(1).default(0.75),
      maxIssuesToScan: z.number().default(50),
    })
    .default({}),
  releaseNotes: z
    .object({
      enabled: z.boolean().default(true),
      includeContributors: z.boolean().default(true),
    })
    .default({}),
});

export type CopilotConfig = z.infer<typeof ConfigSchema>;
