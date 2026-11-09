import type { SecurityPatternMatch, RiskLevel } from "../types/pr.js";
import type { DiffFile } from "../utils/diff-parser.js";

interface StaticRule {
  id: string;
  name: string;
  severity: RiskLevel;
  pattern: RegExp;
  description: string;
}

const STATIC_SECURITY_RULES: StaticRule[] = [
  {
    id: "SEC-001",
    name: "Hardcoded GitHub Token",
    severity: "critical",
    pattern: /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})/,
    description: "Detected hardcoded GitHub personal access token.",
  },
  {
    id: "SEC-002",
    name: "Hardcoded OpenAI / API Key",
    severity: "critical",
    pattern: /sk-[a-zA-Z0-9_-]{20,}/,
    description: "Detected hardcoded OpenAI API key or secret key.",
  },
  {
    id: "SEC-003",
    name: "Hardcoded AWS Access Key",
    severity: "critical",
    pattern: /AKIA[0-9A-Z]{16}/,
    description: "Detected potential hardcoded AWS access key ID.",
  },
  {
    id: "SEC-004",
    name: "Private Cryptographic Key",
    severity: "critical",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    description: "Detected plaintext private key in diff.",
  },
  {
    id: "SEC-005",
    name: "Dangerous Shell Execution (curl | bash)",
    severity: "high",
    pattern: /(?:curl|wget)\s+[^|]+\|\s*(?:bash|sh|zsh)/i,
    description: "Detected untrusted remote script piped directly into shell execution.",
  },
  {
    id: "SEC-006",
    name: "Dangerous Shell Command (eval/exec)",
    severity: "medium",
    pattern: /\b(?:eval\(|execSync\(|child_process\.exec\()/i,
    description:
      "Detected direct shell command execution or eval; verify proper escaping and input validation.",
  },
  {
    id: "SEC-007",
    name: "Insecure Protocol in Production URL",
    severity: "low",
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
    description: "Detected unencrypted HTTP URL. Consider upgrading to HTTPS.",
  },
  {
    id: "SEC-008",
    name: "Overly Permissive File Permission",
    severity: "high",
    pattern: /chmod\s+(?:-R\s+)?(?:777|a\+rwx)/i,
    description: "Detected chmod 777 or unrestricted read/write/execute permissions.",
  },
];

export class SecurityAnalyzer {
  public static readonly DISCLAIMER =
    "⚠️ Automated Preliminary Check: This is an automated preliminary security scan to catch obvious accidental leaks and risks. It DOES NOT replace human code review, formal security auditing, or specialized SAST/DAST testing.";

  /**
   * Run static pattern checks on changed diff lines
   */
  static scanDiff(files: DiffFile[]): SecurityPatternMatch[] {
    const matches: SecurityPatternMatch[] = [];

    for (const file of files) {
      const filePath = file.newPath || file.oldPath || "unknown";

      for (const hunk of file.hunks) {
        const lines = hunk.split("\n");
        let lineCounter = 1;

        for (const line of lines) {
          // Only inspect newly added lines (prefixed with '+')
          if (line.startsWith("+") && !line.startsWith("+++")) {
            const code = line.slice(1);

            for (const rule of STATIC_SECURITY_RULES) {
              if (rule.pattern.test(code)) {
                matches.push({
                  file: filePath,
                  line: lineCounter,
                  rule: rule.name,
                  severity: rule.severity,
                  description: rule.description,
                  snippet: code.trim().slice(0, 100),
                });
              }
            }
          }
          lineCounter++;
        }
      }
    }

    return matches;
  }
}
