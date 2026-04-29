import { NextRequest } from "next/server";
import OpenAI from "openai";
import { jsonToSchema } from "@/app/lib/quicktype-helpers";
import { META_PROMPT } from "@/app/lib/meta-prompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { context, prompt, expected_output, feedback } = body as {
    context: string;
    prompt: string;
    expected_output: string | object;
    feedback: string;
  };

  // 1. Replace {{context}} in the prompt
  const resolvedPrompt = prompt.replace(/\{\{context\}\}/g, context ?? "");

  // 2. Convert expected_output to JSON Schema and append to prompt
  let schema = "";
  try {
    const jsonStr =
      typeof expected_output === "string"
        ? expected_output
        : JSON.stringify(expected_output);
    schema = await jsonToSchema(jsonStr);
  } catch (_) {
    schema = "";
  }

  const promptWithSchema = resolvedPrompt + (schema ? `\n\nOutput JSON Schema:\n${schema}` : "");

  // 3. Build user message for the meta-prompt
  const userMessage = `Current prompt:\n${promptWithSchema}\n\nUser feedback:\n${
    feedback || "(no feedback, just optimize for clarity and effectiveness)"
  }`;

  // 4. Call LLM with streaming and pass the stream as-is
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: META_PROMPT },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  // Pass the raw OpenAI SSE stream directly to the client
  return new Response(completion.toReadableStream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
