import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './_system-prompt.js';
import { checkRateLimit } from './_rate-limit.js';
import { recordActivity } from './_leaderboard-store.js';

const MODEL = 'claude-opus-5';

// max_tokens caps thinking and response text together on Opus 5, so this needs
// headroom above the visible answer or long replies truncate mid-sentence.
const MAX_TOKENS = 16000;

// Opus 5 is unusually strong at medium effort, and chat wants the latency back.
const EFFORT = 'medium';

const MAX_MESSAGES = 40;
const MAX_TEXT_CHARS = 8000;
const MAX_IMAGES_PER_MESSAGE = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const client = new Anthropic();

class BadRequest extends Error {}

/**
 * The wire format is deliberately narrow: {role, text, images[]}. Mapping it
 * onto Anthropic content blocks here rather than accepting blocks from the
 * browser means a caller cannot hand-craft a request that bypasses these
 * limits or smuggles in block types the UI never produces.
 */
function toAnthropicMessages(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new BadRequest('messages must be a non-empty array.');
  }
  if (rawMessages.length > MAX_MESSAGES) {
    throw new BadRequest(
      `Conversation is too long (${rawMessages.length} messages, limit ${MAX_MESSAGES}). Start a new chat.`,
    );
  }

  return rawMessages.map((message, i) => {
    const role = message?.role === 'assistant' ? 'assistant' : 'user';
    const text = typeof message?.text === 'string' ? message.text.trim() : '';
    const images = Array.isArray(message?.images) ? message.images : [];

    if (text.length > MAX_TEXT_CHARS) {
      throw new BadRequest(`Message ${i + 1} is too long (limit ${MAX_TEXT_CHARS} characters).`);
    }
    if (images.length > MAX_IMAGES_PER_MESSAGE) {
      throw new BadRequest(`Too many images on one message (limit ${MAX_IMAGES_PER_MESSAGE}).`);
    }
    if (!text && images.length === 0) {
      throw new BadRequest(`Message ${i + 1} is empty.`);
    }

    const content = [];

    // Images lead: Claude reads a question about an image better when the
    // image precedes the text asking about it.
    for (const image of images) {
      const { mediaType, data } = parseDataUrl(image);
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    }
    if (text) content.push({ type: 'text', text });

    return { role, content };
  });
}

function parseDataUrl(value) {
  if (typeof value !== 'string') {
    throw new BadRequest('Each image must be a data URL string.');
  }
  const match = /^data:([a-z]+\/[a-z+.-]+);base64,(.+)$/i.exec(value);
  if (!match) {
    throw new BadRequest('Images must be base64 data URLs.');
  }
  const mediaType = match[1].toLowerCase();
  const data = match[2];

  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    throw new BadRequest(`Unsupported image type ${mediaType}. Use PNG, JPEG, GIF, or WebP.`);
  }
  // base64 encodes 3 bytes per 4 characters.
  if (Math.floor((data.length * 3) / 4) > MAX_IMAGE_BYTES) {
    throw new BadRequest(`Image is too large (limit ${MAX_IMAGE_BYTES / 1024 / 1024}MB).`);
  }
  return { mediaType, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  // The outermost guard, ahead of the config check and body parsing: a flood
  // has to be throttled whether or not the endpoint is correctly configured,
  // and oversized payloads should be rejected before they are parsed.
  const limit = await checkRateLimit(req);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: limit.reason, retryAfter: limit.retryAfter });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error:
        'The assistant is not configured: ANTHROPIC_API_KEY is missing. Add it in the Vercel project settings and redeploy.',
    });
  }

  let messages;
  try {
    messages = toAnthropicMessages(req.body?.messages);
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    throw err;
  }

  // Leaderboard credit. Awaited but never allowed to throw: the store call is
  // wrapped internally, so a leaderboard outage cannot cost someone their
  // answer. `isFirstMessage` marks a new conversation, which scores higher
  // than another turn inside an existing one.
  const address = /^0x[a-fA-F0-9]{40}$/.test(req.body?.address || '') ? req.body.address : null;
  if (address) {
    await recordActivity(address, {
      questions: 1,
      conversations: req.body?.isFirstMessage ? 1 : 0,
    });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Tells any proxy in front of the function not to buffer the stream.
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Language preference travels as a separate system block, appended after
    // the cached one. Interpolating it into the main prompt would change the
    // cached prefix per language and drop the cache hit rate to zero.
    const system = buildSystemPrompt();
    const language = typeof req.body?.language === 'string' ? req.body.language.slice(0, 60) : null;
    if (language && language !== 'English') {
      system.push({
        type: 'text',
        text: `Reply in ${language}. Keep protocol terms, ticker symbols and product names (Nado, Ink, USDT0, BTC-PERP, unified margin) in their standard form rather than translating them, since that is how they appear in the interface and the docs. If the user writes to you in a different language, follow the user's language instead — what they typed is a stronger signal than this setting.`,
      });
    }

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: EFFORT },
      system,
      messages,
    });

    // Abandon the model call when the browser goes away, so a closed tab does
    // not keep billing tokens to completion.
    req.on('close', () => stream.abort());

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send('delta', { text: event.delta.text });
      }
    }

    const final = await stream.finalMessage();

    // A safety classifier can decline the request: HTTP 200, no usable content.
    // Reading content[0] here without checking would surface as an empty reply.
    if (final.stop_reason === 'refusal') {
      send('error', {
        message:
          "I can't help with that one. If it was an ordinary trading question, rephrase it and I'll try again.",
      });
    } else if (final.stop_reason === 'max_tokens') {
      send('truncated', {
        message: 'That answer was cut short at the length limit. Ask me to continue it.',
      });
    }

    send('done', { stopReason: final.stop_reason, usage: final.usage });
    res.end();
  } catch (err) {
    console.error('[eddy] chat request failed:', err);

    // Headers are already sent, so errors have to travel down the open stream
    // rather than as a status code.
    send('error', { message: describeError(err) });
    send('done', { stopReason: 'error' });
    res.end();
  }
}

function describeError(err) {
  if (err?.name === 'APIUserAbortError') return 'Cancelled.';

  // Out of credit arrives as a plain 400, so without this it fell into the
  // generic branch and reported "something went wrong" for a cause that is
  // specific, actionable, and nothing to do with the question asked.
  const message = err?.error?.error?.message || err?.message || '';
  if (/credit balance is too low/i.test(message)) {
    return 'The assistant’s Anthropic account is out of credits. Top up at console.anthropic.com under Plans & Billing — no code change is needed.';
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return 'The assistant’s API key was rejected. Check ANTHROPIC_API_KEY in the Vercel project settings.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limited — too many requests at once. Wait a few seconds and try again.';
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the model. Check your connection and try again.';
  }
  if (err instanceof Anthropic.APIError && err.status >= 500) {
    return 'The model service is having trouble. Try again in a moment.';
  }
  return 'Something went wrong generating that answer. Try again.';
}
