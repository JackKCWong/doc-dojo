import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Instructor from "@instructor-ai/instructor";
import { z } from "zod";
import { jsonToZodSchema } from "@/app/lib/quicktype-helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: process.env.OPENAI_BASE_URL,
});

const client = Instructor({
  client: openai,
  mode: "JSON",
  debug: true,
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

  if (!expected_output || expected_output.trim() === "") {
    return NextResponse.json({ error: "expected_output is required" }, { status: 400 });
  }

  let zodSchema: z.ZodTypeAny;

  try {
    zodSchema = await jsonToZodSchema(expected_output);
    console.log("[prompt-execution] zodSchema:", JSON.stringify(zodSchema.toJSONSchema(), null, 2));
    console.log("[prompt-execution] Using instructor structured output");
  } catch (e) {
    console.error("[prompt-execution] Could not build Zod schema from expected_output:", e);
    return NextResponse.json({ error: "Invalid expected_output JSON schema" }, { status: 400 });
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `document: ${context}` },
      ],
      response_model: {
        schema: zodSchema,
        name: "structured_output",
      } as any,
      max_retries: 3,
    });

    console.log("[prompt-execution] completion:", JSON.stringify(completion, null, 2));
    return NextResponse.json(completion);
  } catch (err: any) {
    console.error("[prompt-execution] Instructor error:", err?.status, err?.message, err?.error);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}