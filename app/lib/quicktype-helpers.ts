import { InputData, JSONInput, jsonInputForTargetLanguage, quicktype } from "quicktype-core";

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
 * Convert a JSON example string to Zod schema using quicktype.
 */
export async function jsonToZod(jsonExample: string, typeName = "Root"): Promise<string> {
  const jsonInput = jsonInputForTargetLanguage("typescript-zod");
  await jsonInput.addSource({ name: typeName, samples: [jsonExample] });
  const inputData = new InputData();
  inputData.addInput(jsonInput);
  const result = await quicktype({
    inputData,
    lang: "typescript-zod",
    rendererOptions: {},
  });
  
  return result.lines.join("\n");
}
