import pc from "picocolors";
import { redactSecrets } from "./sanitizer.js";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

class Logger {
  private level: LogLevel = "info";

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.level === "silent") return false;
    const levels: Record<LogLevel, number> = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40,
      silent: 50,
    };
    return levels[level] >= levels[this.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("debug")) return;
    const formatted = redactSecrets(message);
    console.debug(pc.gray(`[DEBUG] ${formatted}`), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("info")) return;
    const formatted = redactSecrets(message);
    console.log(pc.blue("ℹ") + " " + formatted, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("info")) return;
    const formatted = redactSecrets(message);
    console.log(pc.green("✔") + " " + formatted, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("warn")) return;
    const formatted = redactSecrets(message);
    console.warn(pc.yellow("⚠") + " " + pc.yellow(formatted), ...args);
  }

  error(message: string, error?: unknown): void {
    if (!this.shouldLog("error")) return;
    const formatted = redactSecrets(message);
    console.error(pc.red("✖") + " " + pc.red(formatted));
    if (error instanceof Error && error.stack) {
      console.error(pc.gray(redactSecrets(error.stack)));
    } else if (error) {
      console.error(pc.gray(redactSecrets(String(error))));
    }
  }
}

export const logger = new Logger();
