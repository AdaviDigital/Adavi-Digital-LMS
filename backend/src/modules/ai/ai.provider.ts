import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Thin wrapper around any OpenAI-compatible /chat/completions endpoint. Swapping providers
 * (OpenAI, Azure OpenAI, a self-hosted vLLM/Ollama endpoint, etc.) only requires changing
 * AI_PROVIDER/AI_API_KEY/AI_BASE_URL in .env — no code changes to the modules that call this.
 */
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
};

function getBaseUrl(): string {
  return process.env.AI_BASE_URL || PROVIDER_BASE_URLS[env.AI_PROVIDER] || PROVIDER_BASE_URLS.openai;
}

export async function aiChatCompletion(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  if (!env.AI_API_KEY) {
    throw new AppError(503, 'AI features are not configured. Set AI_API_KEY in the environment to enable them.');
  }

  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      messages,
      temperature: opts?.temperature ?? 0.4,
      max_tokens: opts?.maxTokens ?? 800,
    }),
  });

  const data: any = await res.json();
  if (!res.ok) {
    throw new AppError(502, `AI provider error: ${data?.error?.message || res.statusText}`);
  }
  return data.choices?.[0]?.message?.content ?? '';
}
