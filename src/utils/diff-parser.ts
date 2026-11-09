export interface DiffFile {
  oldPath?: string;
  newPath?: string;
  isBinary: boolean;
  hunks: string[];
  additions: number;
  deletions: number;
}

export function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1);
    return path.endsWith(ext);
  }
  return path.includes(pattern);
}

export function parseDiff(rawDiff: string, ignorePatterns: string[] = []): DiffFile[] {
  if (!rawDiff) return [];

  const files: DiffFile[] = [];
  const lines = rawDiff.split("\n");
  let currentFile: DiffFile | null = null;
  let currentHunk: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("diff --git ")) {
      if (currentFile) {
        if (currentHunk.length > 0) {
          currentFile.hunks.push(currentHunk.join("\n"));
          currentHunk = [];
        }
        files.push(currentFile);
      }

      const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
      const oldPath = match ? match[1] : undefined;
      const newPath = match ? match[2] : undefined;

      currentFile = {
        oldPath,
        newPath,
        isBinary: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith("Binary files ") || line.includes("GIT binary patch")) {
      currentFile.isBinary = true;
      continue;
    }

    if (line.startsWith("@@")) {
      if (currentHunk.length > 0) {
        currentFile.hunks.push(currentHunk.join("\n"));
        currentHunk = [];
      }
      currentHunk.push(line);
      continue;
    }

    if (currentHunk.length > 0) {
      currentHunk.push(line);
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentFile.additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        currentFile.deletions++;
      }
    }
  }

  if (currentFile) {
    if (currentHunk.length > 0) {
      currentFile.hunks.push(currentHunk.join("\n"));
    }
    files.push(currentFile);
  }

  // Filter out files matching ignore patterns
  return files.filter((file) => {
    const path = file.newPath || file.oldPath || "";
    if (file.isBinary) return false;
    for (const pattern of ignorePatterns) {
      if (matchesPattern(path, pattern)) return false;
    }
    return true;
  });
}

/**
 * Formats parsed diff files into a concise text prompt for AI analysis,
 * respecting the maximum length budget.
 */
export function formatDiffForPrompt(
  files: DiffFile[],
  maxLength: number = 20000
): {
  formattedDiff: string;
  isTruncated: boolean;
  totalFiles: number;
} {
  const parts: string[] = [];
  let currentLength = 0;
  let isTruncated = false;

  for (const file of files) {
    const header = `\n--- File: ${file.newPath || file.oldPath} (+${file.additions}, -${file.deletions}) ---\n`;
    if (currentLength + header.length > maxLength) {
      isTruncated = true;
      break;
    }
    parts.push(header);
    currentLength += header.length;

    for (const hunk of file.hunks) {
      if (currentLength + hunk.length + 1 > maxLength) {
        const remaining = maxLength - currentLength;
        if (remaining > 100) {
          parts.push(hunk.slice(0, remaining) + "\n... [diff truncated]");
        }
        isTruncated = true;
        break;
      }
      parts.push(hunk);
      parts.push("\n");
      currentLength += hunk.length + 1;
    }

    if (isTruncated) break;
  }

  return {
    formattedDiff: parts.join(""),
    isTruncated,
    totalFiles: files.length,
  };
}
