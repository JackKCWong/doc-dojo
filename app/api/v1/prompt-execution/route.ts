import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { jsonToZod } from "@/app/lib/quicktype-helpers";

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

  // Replace {{context}} with actual context
  const resolvedPrompt = prompt.replace(/\{\{context\}\}/g, context ?? "");

  // Convert expected_output to Zod schema for validation hint
  let zodSchema = "";
  try {
    zodSchema = await jsonToZod(expected_output ?? "{}");
  } catch (_) {
    zodSchema = "";
  }

  const systemPrompt = zodSchema
    ? `You are a helpful AI. Return your response as valid JSON matching this Zod schema:\n\n${zodSchema}`
    : "You are a helpful AI. Return your response as valid JSON.";

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: resolvedPrompt },
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
