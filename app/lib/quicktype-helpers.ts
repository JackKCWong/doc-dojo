import { InputData, jsonInputForTargetLanguage, quicktype } from "quicktype-core";
import { z } from "zod";

/**
 * Convert a JSON example string to a JSON Schema string using quicktype.
 */
export async function jsonToSchema(jsonExample: string, typeName = "Root"): Promise<string> {
  const jsonInput = jsonInputForTargetLanguage("schema");
  await jsonInput.addSource({ name: typeName, samples: [jsonExample] });
  const inputData = new InputData();
  inputData.addInput(jsonInput);
  const result = await quicktype({
    inputData,
    lang: "schema",
    rendererOptions: {},
  });
  return result.lines.join("\n");
}

/**
 * Recursively build a Zod schema from a parsed JSON value.
 */
function valueToZod(value: unknown): z.ZodTypeAny {
  if (value === null) return z.null();
  if (Array.isArray(value)) {
    if (value.length === 0) return z.array(z.unknown());
    return z.array(valueToZod(value[0]));
  }
  switch (typeof value) {
    case "string":
      return z.string();
    case "number":
      return Number.isInteger(value) ? z.number().int() : z.number();
    case "boolean":
      return z.boolean();
    case "object": {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        shape[k] = valueToZod(v);
      }
      return z.object(shape);
    }
    default:
      return z.unknown();
  }
}

/**
 * Build a runtime Zod schema from a JSON example string.
 * Used by the prompt-execution API for structured output via instructor.
 */
export async function jsonToZodSchema(jsonExample: string): Promise<z.ZodTypeAny> {
  const parsed = JSON.parse(jsonExample);
  return valueToZod(parsed);
}
