import type { AIProvider } from "../types/ai.js";
import type { CopilotConfig } from "../types/config.js";
import { getEnvironmentCredentials } from "../config/index.js";
import { OpenAIProvider } from "./openai-provider.js";

export function createAIProvider(config: CopilotConfig): AIProvider {
  const credentials = getEnvironmentCredentials();

  switch (config.provider) {
    case "openai": {
      const apiKey = credentials.openaiApiKey;
      if (!apiKey) {
        throw new Error(
          "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable or add it to your .env file."
        );
      }
      const model = credentials.openaiModel || config.model || "gpt-4o-mini";
      return new OpenAIProvider({
        apiKey,
        model,
        baseURL: credentials.openaiBaseUrl,
      });
    }
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

export type { AIProvider } from "../types/ai.js";
