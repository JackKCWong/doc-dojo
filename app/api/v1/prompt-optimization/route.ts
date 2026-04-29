import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { jsonToSchema } from "@/app/lib/quicktype-helpers";
import { META_PROMPT, parseOptimizationResponse } from "@/app/lib/meta-prompt";

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

  // Replace {{context}} with actual context
  const resolvedPrompt = prompt.replace(/\{\{context\}\}/g, context ?? "");

  // Convert expected_output to JSON Schema
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

  const fullPromptForMeta = `Current prompt:\n${resolvedPrompt}\n\n${
    schema ? `Expected output JSON Schema:\n${schema}\n\n` : ""
  }User feedback:\n${feedback || "(no feedback, just optimize for clarity and effectiveness)"}`;

  const encoder = new TextEncoder();
  const id = crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: META_PROMPT },
            { role: "user", content: fullPromptForMeta },
          ],
          stream: true,
        });

        let fullContent = "";

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          fullContent += delta;

          // Stream reasoning chunks as they arrive (before </reasoning> is closed)
          enqueue({ id, type: "reasoning", content: delta });
        }

        // Parse the full response and emit the final prompt
        const { prompt: optimizedPrompt } = parseOptimizationResponse(fullContent);
        const finalPrompt = optimizedPrompt + (schema ? `\n\nOutput JSON Schema:\n${schema}` : "");
        enqueue({ id, type: "prompt", content: finalPrompt });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: any) {
        enqueue({ id, type: "reasoning", content: `Error: ${err.message}` });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
