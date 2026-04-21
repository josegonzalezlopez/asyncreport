/**
 * Abstracción del proveedor de IA.
 *
 * Soporta dos backends seleccionables con la variable AI_PROVIDER:
 *   - "gemini"  → Google Generative AI (producción)
 *   - "ollama"  → Ollama local (desarrollo / sin cuota)
 *
 * Variables de entorno relevantes:
 *   AI_PROVIDER      → "gemini" | "ollama"  (default: "gemini")
 *   GEMINI_API_KEY   → API key de Google AI Studio
 *   GEMINI_MODEL     → Modelo Gemini (default: "gemini-2.0-flash")
 *   OLLAMA_BASE_URL  → URL base de Ollama (default: "http://localhost:11434")
 *   OLLAMA_MODEL     → Modelo Ollama (default: "qwen2.5:7b")
 */

export interface AIGenerateResult {
  content: string;
  /** Tokens totales consumidos (si el proveedor los reporta). */
  tokenCount: number | null;
}

/** Genera contenido de texto a partir de un prompt usando el proveedor configurado. */
export async function generateAIContent(prompt: string): Promise<AIGenerateResult> {
  const provider = process.env['AI_PROVIDER'] ?? 'gemini';

  if (provider === 'ollama') {
    return generateWithOllama(prompt);
  }

  return generateWithGemini(prompt);
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function generateWithGemini(prompt: string): Promise<AIGenerateResult> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await generateGeminiWithRetry(model, prompt);
  const content = result.response.text();
  const tokenCount = result.response.usageMetadata?.totalTokenCount ?? null;

  return { content, tokenCount };
}

async function generateGeminiWithRetry(
  model: Awaited<ReturnType<InstanceType<typeof import('@google/generative-ai').GoogleGenerativeAI>['getGenerativeModel']>>,
  prompt: string,
  maxRetries = 3,
) {
  const { logger } = await import('@/lib/helpers/logger');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      const is429 = raw.includes('429') || raw.toLowerCase().includes('quota');

      if (!is429 || attempt === maxRetries - 1) throw error;

      // Cuota diaria: no reintentar
      if (raw.includes('PerDay') || raw.includes('GenerateRequestsPerDay')) {
        throw error;
      }

      // Parsear retryDelay sugerido por Google
      const delayMatch = raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
      const delayMs = Math.min(
        delayMatch ? Math.ceil(parseFloat(delayMatch[1]!)) * 1000 + 2_000 : 15_000,
        65_000,
      );

      logger.info('Gemini rate limit (per-minute), reintentando...', {
        attempt: attempt + 1,
        delayMs,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Máximo de reintentos alcanzado');
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

interface OllamaChatResponse {
  message?: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

async function generateWithOllama(prompt: string): Promise<AIGenerateResult> {
  const baseUrl = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  const model = process.env['OLLAMA_MODEL'] ?? 'qwen2.5:7b';

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  const content = data.message?.content ?? '';
  const tokenCount =
    (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0) || null;

  return { content, tokenCount };
}
