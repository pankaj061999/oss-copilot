import { z } from "zod";

export const FindingTypeSchema = z.enum([
  "bug",
  "security",
  "performance",
  "maintainability",
  "style",
  "test",
]);

export const RiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const PRFindingSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  type: FindingTypeSchema,
  severity: RiskLevelSchema,
  message: z.string(),
  suggestion: z.string().optional(),
});

export const PRReviewResultSchema = z.object({
  summary: z.string(),
  riskLevel: RiskLevelSchema,
  findings: z.array(PRFindingSchema),
  suggestions: z.array(z.string()),
  testingRecommendations: z.array(z.string()),
  securityNotes: z.string().optional(),
});

export type FindingType = z.infer<typeof FindingTypeSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type PRFinding = z.infer<typeof PRFindingSchema>;
export type PRReviewResult = z.infer<typeof PRReviewResultSchema>;

export interface SecurityPatternMatch {
  file: string;
  line?: number;
  rule: string;
  severity: RiskLevel;
  description: string;
  snippet?: string;
}

export interface PRReviewOptions {
  prNumber: number;
  postComment?: boolean;
  failOnHighRisk?: boolean;
}
