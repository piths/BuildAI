import { NextRequest, NextResponse } from 'next/server';

const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
const TOKEN_URL = 'https://auth.openai.com/oauth/token';
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite-preview-09-2025';

interface ChatMsg {
  role: string;
  content: unknown;
}

export interface RateLimits {
  primaryUsedPercent: number | null;
  primaryWindowMinutes: number | null;
  primaryResetSeconds: number | null;
  secondaryUsedPercent: number | null;
  secondaryWindowMinutes: number | null;
  secondaryResetSeconds: number | null;
}

function parseHeaderNum(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function extractRateLimits(headers: Headers): RateLimits {
  return {
    primaryUsedPercent: parseHeaderNum(headers.get('x-codex-primary-used-percent')),
    primaryWindowMinutes: parseHeaderNum(headers.get('x-codex-primary-window-minutes')),
    primaryResetSeconds: parseHeaderNum(headers.get('x-codex-primary-reset-after-seconds')),
    secondaryUsedPercent: parseHeaderNum(headers.get('x-codex-secondary-used-percent')),
    secondaryWindowMinutes: parseHeaderNum(headers.get('x-codex-secondary-window-minutes')),
    secondaryResetSeconds: parseHeaderNum(headers.get('x-codex-secondary-reset-after-seconds')),
  };
}

let lastRateLimits: RateLimits | null = null;

export function getLastRateLimits(): RateLimits | null {
  return lastRateLimits;
}

/**
 * Refreshes the access token using the stored refresh token.
 * Returns the new access token, or null if refresh is not possible.
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) return null;

    const tokens = await response.json();
    return tokens.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Calls the ChatGPT subscription via the Codex backend (Responses API, streaming).
 * Accumulates the streamed output and returns the final text.
 */
async function callCodexBackend(
  accessToken: string,
  accountId: string,
  systemPrompt: string,
  messages: ChatMsg[]
): Promise<string> {
  // Convert chat messages to Responses API "input" format
  const input = messages.map((m) => {
    // content can be a string or an array (multimodal)
    if (typeof m.content === 'string') {
      return {
        type: 'message',
        role: m.role,
        content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }],
      };
    }
    // multimodal array — map to input_text / input_image
    const contentArr = (m.content as Array<Record<string, unknown>>).map((c) => {
      if (c.type === 'text') {
        return { type: 'input_text', text: c.text };
      }
      if (c.type === 'image_url') {
        const imgUrl = (c.image_url as { url: string }).url;
        return { type: 'input_image', image_url: imgUrl };
      }
      return { type: 'input_text', text: '' };
    });
    return { type: 'message', role: m.role, content: contentArr };
  });

  const body = {
    model: process.env.CODEX_MODEL || 'gpt-5.5',
    instructions: systemPrompt,
    input,
    stream: true,
    store: false,
    reasoning: { effort: 'low' },
  };

  const response = await fetch(CODEX_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'chatgpt-account-id': accountId,
      'OpenAI-Beta': 'responses=experimental',
      'originator': 'codex_cli_rs',
      'session_id': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Codex backend error (${response.status}): ${err}`);
  }

  // Capture usage/rate-limit headers from the real response
  lastRateLimits = extractRateLimits(response.headers);

  // Parse SSE stream and accumulate output text.
  // The connection can drop mid-stream ("terminated") on long reasoning gaps —
  // wrap the read loop so we still use whatever output we accumulated.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from Codex backend');

  const decoder = new TextDecoder();
  let buffer = '';
  let outputText = '';

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]' || !data) return;
    try {
      const event = JSON.parse(data);
      if (event.type === 'response.output_text.delta' && event.delta) {
        outputText += event.delta;
      } else if (event.type === 'response.completed' && event.response) {
        const out = event.response.output;
        if (Array.isArray(out) && !outputText) {
          for (const item of out) {
            if (item.content) {
              for (const c of item.content) {
                if (c.type === 'output_text' && c.text) outputText += c.text;
              }
            }
          }
        }
      } else if (event.type === 'response.failed' && event.response?.error) {
        throw new Error(`Codex generation failed: ${event.response.error.message || 'unknown'}`);
      }
    } catch (e) {
      // Re-throw explicit failure events; ignore JSON parse noise
      if (e instanceof Error && e.message.startsWith('Codex generation failed')) {
        throw e;
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        processLine(line);
      }
    }
    // Process any remaining buffered line
    if (buffer) processLine(buffer);
  } catch (streamErr) {
    // Connection terminated mid-stream. If we already have a complete-looking
    // JSON payload, use it; otherwise surface a clear error.
    if (!outputText.trim()) {
      throw new Error(
        'The connection to ChatGPT was interrupted before any response arrived. Please try again.'
      );
    }
    console.warn('Codex stream ended early, using partial output:', streamErr);
  }

  return outputText;
}

async function callWithRetry(
  accessToken: string,
  accountId: string,
  systemPrompt: string,
  messages: ChatMsg[],
  refreshToken?: string
): Promise<{ text: string; newAccessToken?: string }> {
  let lastError: Error | null = null;
  let currentToken = accessToken;
  let tokenWasRefreshed = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await callCodexBackend(currentToken, accountId, systemPrompt, messages);
      return { text, newAccessToken: tokenWasRefreshed ? currentToken : undefined };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on explicit generation failures (content policy, etc.)
      if (lastError.message.startsWith('Codex generation failed')) {
        throw lastError;
      }

      // If we have a refresh token, try refreshing before the next attempt
      if (refreshToken && attempt === 0) {
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          currentToken = newToken;
          tokenWasRefreshed = true;
          continue; // Retry immediately with fresh token
        }
      }

      // Brief backoff before retry
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError!;
}

/**
 * Calls OpenRouter (OpenAI-compatible chat completions). Used for alternative
 * models such as google/gemini-2.5-flash-lite-preview-09-2025. The messages are
 * already in OpenAI format (string or multimodal content arrays), so they pass
 * through unchanged with the system prompt prepended.
 */
async function callOpenRouter(
  model: string,
  systemPrompt: string,
  messages: ChatMsg[]
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OpenRouter is not configured. Add OPENROUTER_API_KEY to .env.local');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // Optional attribution headers recommended by OpenRouter.
      'HTTP-Referer': 'https://buildai.local',
      'X-Title': 'BuildAI',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('OpenRouter returned an empty response. Please try again.');
  }
  return text;
}

/** Strip markdown fences and parse the model output into a floor-plan object. */
function parseFloorPlan(rawText: string) {
  const jsonText = rawText.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('The AI response was incomplete or not valid JSON. Please try again.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, messages, provider, model } = await request.json();

    // ── OpenRouter provider (e.g. Gemini) — uses a server API key, no sign-in ──
    if (provider === 'openrouter') {
      const rawText = await callOpenRouter(model || DEFAULT_OPENROUTER_MODEL, systemPrompt, messages);
      const floorPlan = parseFloorPlan(rawText);
      return NextResponse.json({ floorPlan });
    }

    // ── Default: ChatGPT subscription via the Codex backend ──
    const accessToken = request.cookies.get('chatgpt_access_token')?.value;
    const accountId = request.cookies.get('chatgpt_account_id')?.value || '';
    const refreshToken = request.cookies.get('chatgpt_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Please sign in with ChatGPT to generate floor plans.' },
        { status: 401 }
      );
    }

    const { text: rawText, newAccessToken } = await callWithRetry(
      accessToken,
      accountId,
      systemPrompt,
      messages,
      refreshToken
    );

    // Strip markdown fences and parse JSON
    const floorPlan = parseFloorPlan(rawText);

    const res = NextResponse.json({ floorPlan });

    // If the token was refreshed, update the cookie for subsequent requests
    if (newAccessToken) {
      res.cookies.set('chatgpt_access_token', newAccessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    const isAuthError =
      message.includes('sign in') || message.includes('401') || message.includes('403');
    return NextResponse.json(
      { error: isAuthError ? 'Your session has expired. Please sign in again.' : message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
