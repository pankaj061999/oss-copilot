export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface StructuredCompletionOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  generateText(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;
  generateStructured<T>(
    prompt: string,
    systemPrompt: string,
    schemaValidator: (data: unknown) => T,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T>;
}
