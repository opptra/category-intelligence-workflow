function requireValue(value, label) {
  if (value === null || value === undefined) {
    throw new Error(`Missing required value: ${label}`);
  }
  return value;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required string: ${label}`);
  }
  return value;
}

function requireNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Missing required non-empty array: ${label}`);
  }
  return value;
}

function requireApiKey(config) {
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it in your environment.');
  }
}

function requireNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new Error(`Missing required number: ${label}`);
  }
  return value;
}

module.exports = {
  requireValue,
  requireNonEmptyString,
  requireNonEmptyArray,
  requireApiKey,
  requireNumber
};
