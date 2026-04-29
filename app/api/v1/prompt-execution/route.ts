import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { jsonToSchema } from "@/app/lib/quicktype-helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(req: NextRequest) {
  console.log("[prompt-execution] OPENAI_BASE_URL:", process.env.OPENAI_BASE_URL ?? "(not set)");
  console.log("[prompt-execution] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 8)}...` : "(not set)");
  console.log("[prompt-execution] OPENAI_MODEL:", process.env.OPENAI_MODEL ?? "(not set, default: gpt-4o-mini)");

  const body = await req.json();
  const { context, prompt, expected_output } = body as {
    context: string;
    prompt: string;
    expected_output: string;
  };

  console.log("[prompt-execution] expected_output:", expected_output?.slice(0, 100));

  // 1. Build resolved prompt (context is passed separately as user message)
  const resolvedPrompt = prompt;

  // 2. Convert expected_output to JSON Schema and use as a system hint
  let schemaHint = "";
  try {
    if (expected_output && expected_output.trim() !== "") {
      schemaHint = await jsonToSchema(expected_output);
    }
  } catch (e) {
    console.warn("[prompt-execution] Could not build JSON schema from expected_output:", e);
  }

  const fullSystemPrompt = schemaHint
    ? `${resolvedPrompt}\n\nReturn your response as valid JSON matching this JSON Schema:\n\n${schemaHint}`
    : `${resolvedPrompt}\n\nReturn your response as valid JSON.`;

  console.log("[prompt-execution] fullSystemPrompt:\n", fullSystemPrompt);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: `document: ${context}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let result: unknown;
    try {
      result = JSON.parse(content);
    } catch {
      result = content;
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("[prompt-execution] OpenAI error:", err?.status, err?.message, err?.error);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
