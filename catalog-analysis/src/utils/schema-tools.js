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

module.exports = {
  SCHEMAS_DIR,
  loadSchema,
  toolDefinition
};
