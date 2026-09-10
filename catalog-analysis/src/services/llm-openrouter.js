const OpenAI = require('openai');

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`LLM response is not valid JSON: ${err.message}`);
  }
}

/**
 * OpenRouter / OpenAI-compatible providers are stricter and flakier with
 * draft-2020 features like additionalProperties:false. Strip them for the wire format.
 */
function sanitizeSchemaForOpenAi(schema) {
  if (Array.isArray(schema)) {
    return schema.map(sanitizeSchemaForOpenAi);
  }
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties') continue;
    if (key === '$schema') continue;
    out[key] = sanitizeSchemaForOpenAi(value);
  }
  return out;
}

/** Map Anthropic-shaped tool `{ name, description, input_schema }` to OpenAI tools. */
function toOpenAiTools(tool) {
  return [{
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: sanitizeSchemaForOpenAi(tool.input_schema || { type: 'object', properties: {} })
    }
  }];
}

function tryParseJson(raw) {
  if (raw && typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch (firstErr) {
    const stack = [];
    for (const ch of String(raw || '')) {
      if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') stack.pop();
    }
    if (!stack.length) throw firstErr;

    let repaired = String(raw).trim().replace(/,\s*$/, '');
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) repaired += '"';
    repaired = repaired.replace(/,\s*$/, '');
    while (stack.length) {
      const open = stack.pop();
      repaired += open === '{' ? '}' : ']';
    }
    return JSON.parse(repaired);
  }
}

function coerceToolPayload(parsed, toolName) {
  if (!parsed || typeof parsed !== 'object') return parsed;

  // Already the expected composition/report shape — do not unwrap a wrapper key.
  if (!Array.isArray(parsed) && (parsed.gallery != null || parsed.aplus != null)) {
    return parsed;
  }

  // Some providers wrap the payload: { synthesize_topics: { topics: [...] } }
  if (parsed[toolName] && typeof parsed[toolName] === 'object') {
    return parsed[toolName];
  }
  const dashed = toolName.replace(/_/g, '-');
  if (parsed[dashed] && typeof parsed[dashed] === 'object') {
    return parsed[dashed];
  }
  return parsed;
}

/** A payload is only usable if it is a non-empty object (or a non-empty array). */
function isUsablePayload(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).length > 0;
}

function extractToolArguments(response, toolName) {
  const choice = response.choices?.[0];
  const finishReason = choice?.finish_reason;
  const message = choice?.message;

  if (process.env.DEBUG_LLM) {
    try {
      // eslint-disable-next-line no-console
      console.error(`[DEBUG_LLM] ${toolName} raw choice:\n${JSON.stringify(choice, null, 2)}`);
    } catch (_) { /* ignore */ }
  }

  // OpenRouter occasionally returns refusal / empty message under load.
  if (message?.refusal) {
    throw new Error(`LLM refused tool call for ${toolName}: ${message.refusal}`);
  }

  const toolCalls = message?.tool_calls || [];
  if (finishReason === 'length' || finishReason === 'max_tokens') {
    throw new Error(
      `LLM tool call truncated for ${toolName} (finish_reason=${finishReason}). `
      + 'Partial JSON is not accepted — raise maxTokens.'
    );
  }

  const toolCall = toolCalls.find((call) => {
    const name = call.function?.name || call.name || '';
    return name === toolName || name.endsWith(`.${toolName}`) || name.replace(/-/g, '_') === toolName;
  }) || toolCalls[0];

  let parsed = null;

  if (toolCall) {
    const args = toolCall.function?.arguments ?? toolCall.arguments ?? toolCall.input;
    if (args !== undefined && args !== null && args !== '') {
      try {
        const candidate = coerceToolPayload(tryParseJson(args), toolName);
        // Empty `{}` args happen when the model dumps JSON into content instead
        // of the tool call. Don't accept it — let the content fallback run.
        if (isUsablePayload(candidate)) parsed = candidate;
      } catch (err) {
        throw new Error(
          `LLM tool arguments are not valid JSON for ${toolName}: ${err.message}`
          + (finishReason ? ` (finish_reason=${finishReason})` : '')
        );
      }
    }
  }

  // Fallback: some OpenRouter Claude responses put JSON in content instead of tool_calls.
  if (!isUsablePayload(parsed)) {
    const content = message?.content;
    const text = Array.isArray(content)
      ? content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('\n')
      : content;
    if (typeof text === 'string' && text.trim()) {
      try {
        const candidate = coerceToolPayload(extractJson(text), toolName);
        if (isUsablePayload(candidate)) parsed = candidate;
      } catch (_) {
        /* fall through */
      }
    }
  }

  if (!isUsablePayload(parsed)) {
    const keys = message ? Object.keys(message).join(',') : 'no-message';
    const emptyToolCall = toolCalls.length > 0 && !parsed;
    throw new Error(
      `LLM did not return usable tool payload for ${toolName}`
      + (finishReason ? ` (finish_reason=${finishReason})` : '')
      + (emptyToolCall ? ' [tool call had empty/unusable arguments]' : '')
      + ` [message_keys=${keys}; tool_calls=${toolCalls.length}]`
    );
  }

  return parsed;
}

function normalizeImages({ imageBase64, mediaType, images }) {
  if (Array.isArray(images) && images.length) {
    return images.map((img) => ({
      base64: img.base64 || img.imageBase64,
      mediaType: img.mediaType || 'image/jpeg'
    }));
  }
  if (imageBase64) {
    return [{ base64: imageBase64, mediaType: mediaType || 'image/jpeg' }];
  }
  return [];
}

function isNonRetryableLlmError(err) {
  const status = err?.status || err?.statusCode || err?.error?.status;
  const type = err?.error?.type || err?.error?.error?.type || '';
  const message = String(err?.message || '');
  if (status === 400 || status === 401 || status === 403 || status === 404) return true;
  if (/not_found_error|authentication|invalid.?api.?key|permission|finish_reason=error/i.test(`${type} ${message}`)) {
    return true;
  }
  return false;
}

function createOpenRouterClient(config) {
  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY is required. Set it in your environment.');
  }

  const headers = {
    'X-OpenRouter-Title': config.openRouterAppName || 'scrapper-agent-workflow'
  };
  if (config.openRouterSiteUrl) {
    headers['HTTP-Referer'] = config.openRouterSiteUrl;
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: headers,
    timeout: config.requestTimeoutMs || 120000
  });
  const maxAttempts = 2;

  async function withRetry(fn, label = 'openrouter') {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (isNonRetryableLlmError(err) || attempt >= maxAttempts) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    throw lastError;
  }

  async function completeText({ system, user, maxTokens = 4096 }) {
    return withRetry(async () => {
      const response = await client.chat.completions.create({
        model: config.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      });
      return response.choices?.[0]?.message?.content || '';
    }, 'completeText');
  }

  async function completeJson({ system, user, maxTokens = 4096 }) {
    const text = await completeText({
      system: `${system}\n\nRespond with valid JSON only. No markdown unless wrapping JSON in a code fence.`,
      user,
      maxTokens
    });
    return extractJson(text);
  }

  async function completeVisionJson({
    system,
    user,
    imageBase64,
    mediaType = 'image/jpeg',
    images,
    maxTokens = 4096
  }) {
    return withRetry(async () => {
      const imgs = normalizeImages({ imageBase64, mediaType, images });
      const content = [
        ...imgs.map((img) => ({
          type: 'image_url',
          image_url: { url: `data:${img.mediaType};base64,${img.base64}` }
        })),
        { type: 'text', text: user }
      ];
      const response = await client.chat.completions.create({
        model: config.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: `${system}\n\nRespond with valid JSON only.` },
          { role: 'user', content }
        ]
      });
      return extractJson(response.choices?.[0]?.message?.content || '');
    }, 'completeVisionJson');
  }

  async function completeTool({ system, user, tool, maxTokens = 4096 }) {
    return withRetry(async () => {
      const response = await client.chat.completions.create({
        model: config.model,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: typeof user === 'string' ? user : user }
        ],
        tools: toOpenAiTools(tool),
        tool_choice: { type: 'function', function: { name: tool.name } }
      });
      return extractToolArguments(response, tool.name);
    }, `completeTool:${tool.name}`);
  }
  async function completeVisionTool({
    system,
    user,
    tool,
    imageBase64,
    mediaType = 'image/jpeg',
    images,
    maxTokens = 4096
  }) {
    return withRetry(async () => {
      const imgs = normalizeImages({ imageBase64, mediaType, images });
      const content = [
        ...imgs.map((img) => ({
          type: 'image_url',
          image_url: { url: `data:${img.mediaType};base64,${img.base64}` }
        })),
        { type: 'text', text: user }
      ];
      const response = await client.chat.completions.create({
        model: config.model,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content }
        ],
        tools: toOpenAiTools(tool),
        tool_choice: { type: 'function', function: { name: tool.name } }
      });
      return extractToolArguments(response, tool.name);
    }, `completeVisionTool:${tool.name}`);
  }

  return {
    completeText,
    completeJson,
    completeVisionJson,
    completeTool,
    completeVisionTool
  };
}

module.exports = { createOpenRouterClient, coerceToolPayload, extractToolArguments };
