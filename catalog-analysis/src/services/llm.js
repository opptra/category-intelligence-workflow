const Anthropic = require('@anthropic-ai/sdk');

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  return JSON.parse(raw);
}

function createLlmClient(config) {
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it in your environment.');
  }

  const client = new Anthropic({ apiKey: config.apiKey });

  async function completeText({ system, user, maxTokens = 4096 }) {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return text;
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
  }

  return {
    completeText,
    completeJson,
    completeVisionJson
  };
}

module.exports = { createLlmClient, extractJson };
