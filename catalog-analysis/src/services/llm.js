const Anthropic = require('@anthropic-ai/sdk');

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

function createLlmClient(config) {
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it in your environment.');
  }

  const client = new Anthropic({ apiKey: config.apiKey });
  const maxAttempts = 3;

  async function withRetry(fn) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
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
    });
  }

  async function completeJson({ system, user, maxTokens = 4096 }) {
    const text = await completeText({
      system: `${system}\n\nRespond with valid JSON only. No markdown unless wrapping JSON in a code fence.`,
      user,
      maxTokens
    });
    return extractJson(text);
  }

  async function completeVisionJson({ system, user, imageBase64, mediaType = 'image/jpeg', maxTokens = 4096 }) {
    return withRetry(async () => {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: maxTokens,
        system: `${system}\n\nRespond with valid JSON only.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            { type: 'text', text: user }
          ]
        }]
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return extractJson(text);
    });
  }

  function extractToolInput(response, toolName) {
    const toolUse = response.content.find(
      (block) => block.type === 'tool_use' && block.name === toolName
    );
    if (!toolUse) {
      throw new Error(`LLM did not return tool_use for ${toolName}`);
    }
    return toolUse.input;
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
    });
  }

  async function completeVisionTool({
    system,
    user,
    tool,
    imageBase64,
    mediaType = 'image/jpeg',
    maxTokens = 4096
  }) {
    return withRetry(async () => {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: maxTokens,
        system: cachedSystem(system),
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            { type: 'text', text: user }
          ]
        }]
      });
      return extractToolInput(response, tool.name);
    });
  }

  return {
    completeText,
    completeJson,
    completeVisionJson,
    completeTool,
    completeVisionTool
  };
}

module.exports = { createLlmClient, extractJson };
