// AI-related utilities for edge functions
import { log } from "./core.ts";

// ============= Types =============
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============= Available Models =============
export const AIModels = {
  // GPT-5 family (newest - use max_completion_tokens, NO temperature)
  GPT5: "gpt-5-2025-08-07",
  GPT5_MINI: "gpt-5-mini-2025-08-07",
  GPT5_NANO: "gpt-5-nano-2025-08-07",
  
  // GPT-4.1 family
  GPT4_1: "gpt-4.1-2025-04-14",
  GPT4_1_MINI: "gpt-4.1-mini-2025-04-14",
  
  // Reasoning models
  O3: "o3-2025-04-16",
  O4_MINI: "o4-mini-2025-04-16",
  
  // Legacy models (use max_tokens, support temperature)
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
} as const;

// Models that DON'T support temperature parameter
const NO_TEMPERATURE_MODELS = [
  AIModels.GPT5,
  AIModels.GPT5_MINI,
  AIModels.GPT5_NANO,
  AIModels.O3,
  AIModels.O4_MINI,
];

// Models that use max_completion_tokens instead of max_tokens
const NEW_TOKEN_PARAM_MODELS = [
  AIModels.GPT5,
  AIModels.GPT5_MINI,
  AIModels.GPT5_NANO,
  AIModels.GPT4_1,
  AIModels.GPT4_1_MINI,
  AIModels.O3,
  AIModels.O4_MINI,
];

// ============= OpenAI Integration =============
export async function callOpenAI(
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  
  const model = options.model || AIModels.GPT4O_MINI;
  const maxTokens = options.maxTokens || 4096;
  
  // Build request body based on model capabilities
  const body: Record<string, unknown> = {
    model,
    messages,
  };
  
  // Use correct token parameter based on model
  if (NEW_TOKEN_PARAM_MODELS.includes(model as any)) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }
  
  // Only add temperature for models that support it
  if (!NO_TEMPERATURE_MODELS.includes(model as any) && options.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  
  log("info", "Calling OpenAI API", { model, messageCount: messages.length });
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    log("error", "OpenAI API error", { status: response.status, error });
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

// ============= Lovable AI Integration =============
export async function callLovableAI(
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }
  
  const model = options.model || "google/gemini-2.5-flash";
  
  log("info", "Calling Lovable AI API", { model, messageCount: messages.length });
  
  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    log("error", "Lovable AI API error", { status: response.status, error });
    throw new Error(`Lovable AI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

// ============= Unified AI Call =============
export async function callAI(
  messages: AIMessage[],
  options: AIRequestOptions & { provider?: "openai" | "lovable" } = {}
): Promise<AIResponse> {
  const { provider = "lovable", ...aiOptions } = options;
  
  // Try Lovable AI first (no API key needed from user)
  if (provider === "lovable" || !Deno.env.get("OPENAI_API_KEY")) {
    try {
      return await callLovableAI(messages, aiOptions);
    } catch (error) {
      log("warn", "Lovable AI failed, falling back to OpenAI", { error: (error as Error).message });
      // Fall back to OpenAI if available
      if (Deno.env.get("OPENAI_API_KEY")) {
        return await callOpenAI(messages, aiOptions);
      }
      throw error;
    }
  }
  
  return await callOpenAI(messages, aiOptions);
}

// ============= JSON Parsing Helper =============
export function parseAIJsonResponse<T>(content: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
    
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    log("warn", "Failed to parse AI JSON response", { error: (error as Error).message });
    return null;
  }
}
