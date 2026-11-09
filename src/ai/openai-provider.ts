import OpenAI from "openai";
import type { AIProvider, ChatMessage } from "../types/ai.js";
import { withRetry } from "../utils/retry.js";
import { redactSecrets } from "../utils/sanitizer.js";
import { logger } from "../utils/logger.js";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export class OpenAIProvider implements AIProvider {
  public readonly name = "openai";
  private client: OpenAI;
  private defaultModel: string;

  constructor(options: OpenAIProviderOptions) {
    this.defaultModel = options.model;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
  }

  async generateText(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    return withRetry(async () => {
      try {
        const response = await this.client.chat.completions.create({
          model: this.defaultModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens ?? 2000,
        });

        const text = response.choices[0]?.message?.content;
        if (!text) {
          throw new Error("Empty response received from OpenAI API.");
        }
        return text;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const safeMessage = redactSecrets(message);
        logger.debug(`OpenAI generateText error: ${safeMessage}`);
        throw new Error(`OpenAI request failed: ${safeMessage}`);
      }
    });
  }

  async generateStructured<T>(
    prompt: string,
    systemPrompt: string,
    schemaValidator: (data: unknown) => T,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T> {
    return withRetry(async () => {
      try {
        const augmentedSystemPrompt = `${systemPrompt}\n\nIMPORTANT: You MUST respond ONLY with a single valid JSON object satisfying the requested structure. Do not wrap in markdown code blocks (\`\`\`json) if possible, or provide raw json.`;

        const response = await this.client.chat.completions.create({
          model: this.defaultModel,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: augmentedSystemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? 3000,
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error("Empty content received from OpenAI completion.");
        }

        // Clean any stray markdown fences if returned
        let cleanJson = rawContent.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.slice(7);
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.slice(3);
        }
        if (cleanJson.endsWith("```")) {
          cleanJson = cleanJson.slice(0, -3);
        }
        cleanJson = cleanJson.trim();

        const parsed = JSON.parse(cleanJson);
        return schemaValidator(parsed);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const safeMessage = redactSecrets(message);
        logger.debug(`OpenAI structured generation error: ${safeMessage}`);
        throw new Error(`Failed to generate structured AI response: ${safeMessage}`);
      }
    });
  }
}
