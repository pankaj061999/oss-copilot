import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import dotenv from "dotenv";
import { ConfigSchema, type CopilotConfig } from "../types/config.js";
import { logger } from "../utils/logger.js";

// Load local .env if present
dotenv.config();

const DEFAULT_CONFIG_FILE = ".oss-copilot.yml";

export function loadConfig(customPath?: string): CopilotConfig {
  const configPath = customPath
    ? path.resolve(process.cwd(), customPath)
    : path.resolve(process.cwd(), DEFAULT_CONFIG_FILE);

  let rawConfig: Record<string, unknown> = {};

  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, "utf-8");
      const parsed = yaml.parse(fileContent);
      if (parsed && typeof parsed === "object") {
        rawConfig = parsed;
      }
    } catch (err) {
      logger.warn(`Failed to parse config file at ${configPath}, falling back to defaults.`, err);
    }
  }

  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    logger.warn(
      `Invalid configuration in ${configPath}, using defaults. Validation errors:`,
      result.error.format()
    );
    return ConfigSchema.parse({});
  }

  return result.data;
}

export interface EnvironmentCredentials {
  githubToken?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
}

export function getEnvironmentCredentials(): EnvironmentCredentials {
  return {
    githubToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
  };
}
