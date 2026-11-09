import { describe, it, expect, vi } from "vitest";
import { OpenAIProvider } from "../src/ai/openai-provider.js";
import { z } from "zod";

describe("OpenAI Provider", () => {
  it("should initialize with custom options", () => {
    const provider = new OpenAIProvider({
      apiKey: "test_key",
      model: "gpt-4o-mini",
    });
    expect(provider.name).toBe("openai");
  });

  it("should successfully parse valid structured JSON responses", async () => {
    const provider = new OpenAIProvider({
      apiKey: "test_key",
      model: "gpt-4o-mini",
    });

    const mockSchema = z.object({
      status: z.string(),
      code: z.number(),
    });

    // Mock internal OpenAI completions.create
    const fakeClient = (
      provider as unknown as { client: { chat: { completions: { create: unknown } } } }
    ).client;
    fakeClient.chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '```json\n{"status": "ok", "code": 200}\n```',
              },
            },
          ],
        }),
      },
    };

    const result = await provider.generateStructured(
      "Test user prompt",
      "Test system prompt",
      (raw) => mockSchema.parse(raw)
    );

    expect(result.status).toBe("ok");
    expect(result.code).toBe(200);
  });

  it("should throw a sanitized error if JSON parsing or schema fails", async () => {
    const provider = new OpenAIProvider({
      apiKey: "test_key",
      model: "gpt-4o-mini",
    });

    const fakeClient = (
      provider as unknown as { client: { chat: { completions: { create: unknown } } } }
    ).client;
    fakeClient.chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "invalid json string",
              },
            },
          ],
        }),
      },
    };

    await expect(provider.generateStructured("prompt", "system", (raw) => raw)).rejects.toThrow(
      "Failed to generate structured AI response"
    );
  });
});
