const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.join(__dirname, '../domain/schemas');

function loadSchema(schemaId) {
  const file = path.join(SCHEMAS_DIR, `${schemaId}.schema.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Schema not found: ${schemaId}`);
  }
  const schema = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const { $schema, ...inputSchema } = schema;
  return inputSchema;
}

function toolDefinition(schemaId, description) {
  const toolName = schemaId.replace(/-/g, '_');
  return {
    name: toolName,
    description,
    input_schema: loadSchema(schemaId)
  };
}

// Keywords Anthropic strict tool use / structured outputs do NOT support.
// They must be stripped from the wire schema (minItems 0/1 is the exception).
const STRICT_UNSUPPORTED = [
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'maxItems', 'minProperties', 'maxProperties'
];

/**
 * Transform a JSON schema into the subset Anthropic accepts for `strict: true`:
 * - strip unsupported value constraints (keep minItems only when 0 or 1)
 * - force additionalProperties:false on every object
 * - mark every declared property as required (strict has no "optional"; use
 *   nullable types in the schema itself if a field may be absent)
 * The original schema still governs our own post-response validation.
 */
function strictifySchema(node) {
  if (Array.isArray(node)) return node.map(strictifySchema);
  if (!node || typeof node !== 'object') return node;

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (STRICT_UNSUPPORTED.includes(key)) continue;
    if (key === 'minItems' && !(value === 0 || value === 1)) continue;
    if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, strictifySchema(v)])
      );
      continue;
    }
    if (key === 'items') {
      out.items = strictifySchema(value);
      continue;
    }
    out[key] = strictifySchema(value);
  }

  if (out.type === 'object' && out.properties) {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties);
  }
  return out;
}

function strictToolDefinition(schemaId, description) {
  const tool = toolDefinition(schemaId, description);
  return {
    ...tool,
    input_schema: strictifySchema(tool.input_schema),
    strict: true
  };
}

module.exports = {
  toolDefinition,
  strictToolDefinition,
  strictifySchema
};
