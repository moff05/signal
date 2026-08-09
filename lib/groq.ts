import OpenAI from 'openai';

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

let client: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey,
    });
  }
  return client;
}

// Long free-text capture ("I typed 40 lines of thoughts") gets condensed into
// a short title so the list stays scannable; the original stays as details.
// Best-effort — any failure (missing key, rate limit, network) falls back to
// a plain truncation so saving never blocks on the AI call.
export async function summarizeToTitle(text: string): Promise<string> {
  try {
    const client = getAIClient();
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 30,
      messages: [
        {
          role: 'system',
          content:
            'You compress a note into a short title for a to-do list. Reply with ONLY the title text — no quotes, no punctuation at the end, no explanation. Keep it under 60 characters and capture the concrete action or subject, not a vague summary.',
        },
        { role: 'user', content: text },
      ],
    });
    const title = completion.choices[0]?.message?.content?.trim();
    if (title) return title;
  } catch {
    // fall through to truncation fallback below
  }
  return text.length > 60 ? `${text.slice(0, 57).trim()}…` : text;
}
