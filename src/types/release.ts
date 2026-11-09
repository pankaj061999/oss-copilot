import { z } from "zod";

export const ReleaseNotesGroupSchema = z.object({
  features: z.array(z.string()).default([]),
  bugFixes: z.array(z.string()).default([]),
  performance: z.array(z.string()).default([]),
  security: z.array(z.string()).default([]),
  documentation: z.array(z.string()).default([]),
  breakingChanges: z.array(z.string()).default([]),
});

export const ReleaseNotesResultSchema = z.object({
  version: z.string(),
  fromTag: z.string().optional(),
  toTag: z.string(),
  summary: z.string(),
  groups: ReleaseNotesGroupSchema,
  contributors: z.array(z.string()).default([]),
});

export type ReleaseNotesGroup = z.infer<typeof ReleaseNotesGroupSchema>;
export type ReleaseNotesResult = z.infer<typeof ReleaseNotesResultSchema>;

export interface ReleaseNotesOptions {
  fromTag?: string;
  toTag: string;
  outputPath?: string;
  includeContributors?: boolean;
}

export interface ChangelogOptions {
  fromTag?: string;
  toTag: string;
  filePath?: string;
}
