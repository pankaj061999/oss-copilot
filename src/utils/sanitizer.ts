const SECRET_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  /(?:Bearer|token)\s+[a-zA-Z0-9_\-.]{20,}/gi,
  /(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*["']?([^\s"';]{8,})["']?/gi,
];

/**
 * Redacts known secret patterns from strings before printing or transmitting.
 */
export function redactSecrets(input: string): string {
  if (!input) return "";
  let redacted = input;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      if (match.length <= 8) return "[REDACTED]";
      return `${match.slice(0, 4)}...[REDACTED]...${match.slice(-2)}`;
    });
  }
  return redacted;
}

/**
 * Sanitizes markdown content before posting as comments to GitHub.
 * Disallows raw <script>, <iframe>, <object>, <embed>, and dangerous html links.
 */
export function sanitizeMarkdown(content: string): string {
  if (!content) return "";
  let sanitized = content;
  // Strip dangerous html tags
  sanitized = sanitized.replace(
    /<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  sanitized = sanitized.replace(/<\s*(script|iframe|object|embed|style)[^>]*\/?\s*>/gi, "");
  // Strip javascript: uris
  sanitized = sanitized.replace(/\[([^\]]+)\]\(javascript:[^)]+\)/gi, "[$1](#)");
  return sanitized;
}
