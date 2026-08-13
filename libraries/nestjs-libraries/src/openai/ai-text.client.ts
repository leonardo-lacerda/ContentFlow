import OpenAI from 'openai';
import type { ZodType } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

/**
 * Central text/LLM client for ContentFlow. All non-chat text generation should
 * go through here so the app depends on a single provider. By default this is
 * kie.ai (OpenAI-compatible Chat Completions, per-model base URL) using the
 * same model the Studio chat already uses (KIEAI_CHAT_MODEL). Set
 * AI_PRIMARY_PROVIDER=openai only if a real OpenAI key is intentionally used.
 *
 * kie.ai does NOT support OpenAI Structured Outputs (`response_format` /
 * `chat.completions.parse`), so structured results are obtained by instructing
 * the model to emit JSON and validating it with the caller's zod schema — see
 * `generateStructured`.
 */
export type AiTextClient = { openai: OpenAI; model: string };

export const aiTextConfig = (): { apiKey: string; baseURL?: string; model: string } => {
  const provider = (process.env.AI_PRIMARY_PROVIDER || 'kie').toLowerCase();
  if (provider === 'openai') {
    return {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1',
    };
  }
  const model = process.env.KIEAI_CHAT_MODEL || 'gpt-5-2';
  return {
    apiKey: process.env.KIEAI_API_KEY || '',
    baseURL:
      process.env.KIEAI_CHAT_BASE_URL ||
      `${(process.env.CREATIVE_KIE_BASE_URL || 'https://api.kie.ai').replace(/\/$/, '')}/${model}/v1`,
    model,
  };
};

export const aiTextClient = (): AiTextClient => {
  const config = aiTextConfig();
  const openai = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  });
  return { openai, model: config.model };
};

// Pull the first balanced JSON object/array out of a model response, tolerating
// code fences and any surrounding prose.
export const extractJsonBlock = (text: string): unknown | null => {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.search(/[[{]/);
  if (start < 0) return null;
  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

/**
 * Ask the model for a value matching `schema`. Embeds the schema (via
 * zod-to-json-schema) in the system prompt, extracts the JSON from the reply,
 * and validates it. Returns null after `retries` failed attempts instead of
 * throwing, matching the previous OpenAI structured-output call sites that
 * caught and returned null.
 */
export async function generateStructured<T>(
  schema: ZodType<T>,
  params: {
    system: string;
    user: string;
    schemaName?: string;
    retries?: number;
    temperature?: number;
  }
): Promise<T | null> {
  const { openai, model } = aiTextClient();
  // Reuse openai's own zod->json-schema conversion (no extra dependency) to
  // describe the exact shape to the model, then validate the reply ourselves.
  const responseFormat = zodResponseFormat(schema as any, params.schemaName || 'result');
  const jsonSchema = JSON.stringify(
    (responseFormat as any)?.json_schema?.schema ?? {}
  );
  const system = `${params.system}

Respond with a single valid JSON value and nothing else: no prose, no markdown, no code fences.
The JSON MUST strictly conform to this JSON Schema:
${jsonSchema}`;
  const retries = params.retries ?? 3;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await openai.chat.completions.create({
        model,
        temperature: params.temperature ?? 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: params.user },
        ],
      });
      const content = response.choices?.[0]?.message?.content;
      const raw = typeof content === 'string' ? content : JSON.stringify(content ?? '');
      const parsed = extractJsonBlock(raw);
      if (parsed == null) continue;
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // Retry on transient/provider errors.
    }
  }
  return null;
}
