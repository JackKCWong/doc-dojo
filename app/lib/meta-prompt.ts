export const META_PROMPT = `You are an expert prompt engineer. Your job is to analyze the current prompt, the user's feedback, and the expected output schema, then produce an optimized prompt that better achieves the user's goals.

Guidelines:
- Keep the {{context}} placeholder intact — it will be replaced with actual document content at runtime.
- The optimized prompt should be clear, specific, and structured.
- Include any output format requirements derived from the JSON schema.
- Do not include the JSON schema itself in the output prompt — it will be appended automatically.

Your response MUST be in the following format:
<reasoning>
Your step-by-step reasoning about what to improve and why.
</reasoning>
<prompt>
The complete optimized prompt text.
</prompt>`;

export function parseOptimizationResponse(fullContent: string): {
  reasoning: string;
  prompt: string;
} {
  const reasoningMatch = fullContent.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
  const promptMatch = fullContent.match(/<prompt>([\s\S]*?)<\/prompt>/);
  return {
    reasoning: reasoningMatch?.[1]?.trim() ?? "",
    prompt: promptMatch?.[1]?.trim() ?? fullContent,
  };
}
