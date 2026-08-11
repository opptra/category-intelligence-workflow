const Anthropic = require('@anthropic-ai/sdk');
const { createOpenRouterClient } = require('./llm-openrouter');

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`LLM response is not valid JSON: ${err.message}`);
  }
}

// Marks the system prompt as a cache breakpoint. The request prefix is ordered
// tools -> system -> messages, so caching here reuses the repeating tools + system
// prefix across calls (the per-call image / user text stays uncached after it).
function cachedSystem(system) {
  return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
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
  if (/not_found_error|authentication|invalid.?api.?key|permission/i.test(`${type} ${message}`)) {
    return true;
  }
  return false;
}

function createAnthropicClient(config) {
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it in your environment.');
  }

  // Single retry layer for all Anthropic calls (no outer stage retries).
  const client = new Anthropic({
    apiKey: config.apiKey,
    timeout: config.requestTimeoutMs || 120000
  });
  const maxAttempts = 2;

  async function withRetry(fn, label = 'anthropic') {
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
      const response = await client.messages.create({
        model: config.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }]
      });

      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
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
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType,
            data: img.base64
          }
        })),
        { type: 'text', text: user }
      ];
      const response = await client.messages.create({
        model: config.model,
        max_tokens: maxTokens,
        system: `${system}\n\nRespond with valid JSON only.`,
        messages: [{ role: 'user', content }]
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return extractJson(text);
    }, 'completeVisionJson');
  }

  function extractToolInput(response, toolName) {
    const toolUse = response.content.find(
      (block) => block.type === 'tool_use' && block.name === toolName
    );
    if (!toolUse) {
      const types = (response.content || []).map((b) => b.type).join(',');
      throw new Error(
        `LLM did not return tool_use for ${toolName}`
        + ` (stop_reason=${response.stop_reason || 'n/a'}; blocks=${types || 'none'})`
      );
    }

    const input = toolUse.input;
    const empty = !input
      || typeof input !== 'object'
      || Array.isArray(input)
      || Object.keys(input).length === 0;

    if (empty) {
      throw new Error(
        `LLM returned empty tool input for ${toolName}`
        + ` (stop_reason=${response.stop_reason || 'n/a'}`
        + `; output_tokens=${response.usage?.output_tokens ?? 'n/a'})`
        + (response.stop_reason === 'max_tokens'
          ? ' — response truncated; raise maxTokens or tighten tool schema bounds'
          : '')
      );
    }

    return input;
  }

  async function completeTool({ system, user, tool, maxTokens = 4096 }) {
    return withRetry(async () => {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: maxTokens,
        system: cachedSystem(system),
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: user }]
      });
      return extractToolInput(response, tool.name);
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
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType,
            data: img.base64
          }
        })),
        { type: 'text', text: user }
      ];
      const response = await client.messages.create({
        model: config.model,
        max_tokens: maxTokens,
        system: cachedSystem(system),
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content }]
      });
      return extractToolInput(response, tool.name);
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

function createLlmClient(config) {
  const provider = (config.llmProvider || 'openrouter').toLowerCase();
  if (provider === 'anthropic') {
    return createAnthropicClient(config);
  }
  if (provider === 'openrouter') {
    return createOpenRouterClient(config);
  }
  throw new Error(`Unsupported LLM_PROVIDER "${provider}". Use openrouter or anthropic.`);
}

module.exports = { createLlmClient, createAnthropicClient };
