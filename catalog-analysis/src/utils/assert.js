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

function fieldLabel(labelPrefix, key) {
  return labelPrefix ? `${labelPrefix}.${key}` : key;
}

function requireValueKeys(obj, keys, labelPrefix = '') {
  for (const key of keys) {
    requireValue(obj?.[key], fieldLabel(labelPrefix, key));
  }
}

function requireNonEmptyStringKeys(obj, keys, labelPrefix = '') {
  for (const key of keys) {
    requireNonEmptyString(obj?.[key], fieldLabel(labelPrefix, key));
  }
}

function requireNonEmptyArrayKeys(obj, keys, labelPrefix = '') {
  for (const key of keys) {
    requireNonEmptyArray(obj?.[key], fieldLabel(labelPrefix, key));
  }
}

function requireNumberKeys(obj, keys, labelPrefix = '') {
  for (const key of keys) {
    requireNumber(obj?.[key], fieldLabel(labelPrefix, key));
  }
}

function requireFields(obj, {
  values = [],
  strings = [],
  arrays = [],
  numbers = []
} = {}, labelPrefix = '') {
  requireValueKeys(obj, values, labelPrefix);
  requireNonEmptyStringKeys(obj, strings, labelPrefix);
  requireNonEmptyArrayKeys(obj, arrays, labelPrefix);
  requireNumberKeys(obj, numbers, labelPrefix);
}

module.exports = {
  requireValue,
  requireNonEmptyString,
  requireNonEmptyArray,
  requireApiKey,
  requireNumber,
  requireValueKeys,
  requireNonEmptyStringKeys,
  requireNonEmptyArrayKeys,
  requireNumberKeys,
  requireFields
};
