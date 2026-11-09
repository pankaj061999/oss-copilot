import { z } from "zod";

export const IssueTypeSchema = z.enum([
  "bug",
  "feature",
  "documentation",
  "question",
  "security",
  "performance",
  "duplicate",
  "other",
]);

export const PrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const IssueTriageResultSchema = z.object({
  type: IssueTypeSchema,
  priority: PrioritySchema,
  severity: SeveritySchema,
  suggestedLabels: z.array(z.string()),
  summary: z.string(),
  maintainerResponse: z.string(),
});

export type IssueType = z.infer<typeof IssueTypeSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type IssueTriageResult = z.infer<typeof IssueTriageResultSchema>;

export const DuplicateMatchSchema = z.object({
  issueNumber: z.number(),
  title: z.string(),
  similarityScore: z.number().min(0).max(1),
  reason: z.string(),
});

export const DuplicateCheckResultSchema = z.object({
  isDuplicate: z.boolean(),
  duplicateProbability: z.number().min(0).max(1),
  matchingIssues: z.array(DuplicateMatchSchema),
  explanation: z.string(),
});

export type DuplicateMatch = z.infer<typeof DuplicateMatchSchema>;
export type DuplicateCheckResult = z.infer<typeof DuplicateCheckResultSchema>;

export interface IssueTriageOptions {
  issueNumber: number;
  postComment?: boolean;
  applyLabels?: boolean;
}

export interface DuplicateCheckOptions {
  issueNumber: number;
  similarityThreshold?: number;
  maxIssuesToScan?: number;
}
