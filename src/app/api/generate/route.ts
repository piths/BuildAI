import { NextRequest, NextResponse } from 'next/server';

const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';

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

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, messages } = await request.json();

    const accessToken = request.cookies.get('chatgpt_access_token')?.value;
    const accountId = request.cookies.get('chatgpt_account_id')?.value || '';

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Please sign in with ChatGPT to generate floor plans.' },
        { status: 401 }
      );
    }

    const rawText = await callCodexBackend(accessToken, accountId, systemPrompt, messages);

    // Strip markdown fences and parse JSON
    const jsonText = rawText.replace(/```json|```/g, '').trim();
    let floorPlan;
    try {
      floorPlan = JSON.parse(jsonText);
    } catch {
      // Try to recover a JSON object if there's surrounding text
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        floorPlan = JSON.parse(match[0]);
      } else {
        throw new Error('The AI response was incomplete or not valid JSON. Please try again.');
      }
    }

    return NextResponse.json({ floorPlan });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
