import fs from "node:fs";
import path from "node:path";
import type { ReleaseNotesResult } from "../types/release.js";
import { logger } from "../utils/logger.js";

export class ChangelogGenerator {
  /**
   * Formats a ReleaseNotesResult into standard Keep a Changelog markdown section.
   */
  static formatReleaseSection(
    result: ReleaseNotesResult,
    date: string = new Date().toISOString().slice(0, 10)
  ): string {
    let section = `## [${result.toTag}] - ${date}\n\n`;
    if (result.summary) {
      section += `${result.summary}\n\n`;
    }

    const g = result.groups;
    if (g.breakingChanges && g.breakingChanges.length > 0) {
      section += `### Breaking Changes\n`;
      for (const item of g.breakingChanges) section += `- ${item}\n`;
      section += `\n`;
    }
    if (g.features && g.features.length > 0) {
      section += `### Added\n`;
      for (const item of g.features) section += `- ${item}\n`;
      section += `\n`;
    }
    if (g.bugFixes && g.bugFixes.length > 0) {
      section += `### Fixed\n`;
      for (const item of g.bugFixes) section += `- ${item}\n`;
      section += `\n`;
    }
    if (g.performance && g.performance.length > 0) {
      section += `### Changed\n`;
      for (const item of g.performance) section += `- ${item}\n`;
      section += `\n`;
    }
    if (g.security && g.security.length > 0) {
      section += `### Security\n`;
      for (const item of g.security) section += `- ${item}\n`;
      section += `\n`;
    }
    if (g.documentation && g.documentation.length > 0) {
      section += `### Documentation\n`;
      for (const item of g.documentation) section += `- ${item}\n`;
      section += `\n`;
    }

    return section;
  }

  /**
   * Updates or creates a CHANGELOG.md file, inserting new release entry right after ## [Unreleased]
   * without destroying or overwriting any existing history.
   */
  static updateChangelogFile(
    filePath: string,
    release: ReleaseNotesResult
  ): {
    updated: boolean;
    content: string;
  } {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    const dateStr = new Date().toISOString().slice(0, 10);
    const newSection = this.formatReleaseSection(release, dateStr);

    let currentContent = "";
    if (fs.existsSync(resolvedPath)) {
      currentContent = fs.readFileSync(resolvedPath, "utf-8");
    }

    let updatedContent = "";

    if (!currentContent.trim()) {
      // Create new changelog
      updatedContent = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n## [Unreleased]\n\n${newSection}`;
    } else {
      // Check if version already exists
      const versionRegex = new RegExp(`##\\s*\\[?${release.toTag}\\]?`, "i");
      if (versionRegex.test(currentContent)) {
        logger.warn(
          `Version ${release.toTag} already exists in ${filePath}. Skipping duplicate insertion.`
        );
        return { updated: false, content: currentContent };
      }

      // Find ## [Unreleased]
      const unreleasedMatch = currentContent.match(/(##\s*\[Unreleased\][\s\S]*?)(\n##\s*\[|$)/i);
      if (unreleasedMatch && unreleasedMatch.index !== undefined) {
        // Insert right after the unreleased section header or after its body
        const unreleasedHeaderPos = currentContent.indexOf(unreleasedMatch[1]);
        const insertPos = unreleasedHeaderPos + unreleasedMatch[1].length;

        // If unreleased section is empty or just has comments, insert after it
        updatedContent =
          currentContent.slice(0, insertPos).trimEnd() +
          "\n\n" +
          newSection +
          currentContent.slice(insertPos).trimStart();
      } else {
        // If no unreleased block found, find the first version header or append after top header
        const firstHeaderMatch = currentContent.match(/\n##\s+/);
        if (firstHeaderMatch && firstHeaderMatch.index !== undefined) {
          updatedContent =
            currentContent.slice(0, firstHeaderMatch.index) +
            "\n\n" +
            newSection +
            currentContent.slice(firstHeaderMatch.index + 1);
        } else {
          updatedContent = currentContent + "\n\n" + newSection;
        }
      }
    }

    fs.writeFileSync(resolvedPath, updatedContent, "utf-8");
    logger.success(`Updated ${filePath} with release ${release.toTag}.`);
    return { updated: true, content: updatedContent };
  }
}
