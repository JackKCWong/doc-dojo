"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, ChatMessage } from "../store";

/**
 * Parse the optimized prompt from the LLM's full text response.
 * The meta-prompt instructs the model to separate with "--- OPTIMIZED PROMPT ---".
 */
function extractOptimizedPrompt(fullText: string): string {
  const separator = "--- OPTIMIZED PROMPT ---";
  const idx = fullText.indexOf(separator);
  if (idx !== -1) {
    return fullText.slice(idx + separator.length).trim();
  }
  // Fallback: return the whole text if no separator found
  return fullText.trim();
}

export default function ChatSection() {
  const {
    messages,
    addMessage,
    updateLastAssistantMessage,
    files,
    selectedFileId,
    originalPrompt,
    optimizedPrompt,
    expectedOutput,
    setOptimizedPrompt,
    setActualOutput,
    isOptimizing,
    isTesting,
    setIsOptimizing,
    setIsTesting,
    setOutputTab,
  } = useAppStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getContext = useCallback(() => {
    const selectedFile = files.find((f) => f.id === selectedFileId);
    return selectedFile?.textContent ?? "";
  }, [files, selectedFileId]);

  const handleOptimize = useCallback(async () => {
    const feedback = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: feedback || "(optimize based on current state)",
    };
    addMessage(userMsg);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    addMessage(assistantMsg);
    setIsOptimizing(true);

    try {
      const res = await fetch("/api/v1/prompt-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: getContext(),
          prompt: originalPrompt,
          expected_output: expectedOutput,
          feedback,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        updateLastAssistantMessage(`Error: ${err}`);
        return;
      }

      // Consume the raw OpenAI SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Each SSE chunk may contain multiple lines
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullText += delta;
              updateLastAssistantMessage(fullText);
            }
          } catch (_) {}
        }
      }

      // Extract and store the optimized prompt
      const optimized = extractOptimizedPrompt(fullText);
      setOptimizedPrompt(optimized);

      // Append a separator note to the chat message
      updateLastAssistantMessage(
        fullText + "\n\n---\n✅ **Optimized prompt saved.** Check the \"optimized\" tab."
      );
    } catch (err: any) {
      updateLastAssistantMessage(`Error: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  }, [
    input,
    addMessage,
    updateLastAssistantMessage,
    getContext,
    originalPrompt,
    expectedOutput,
    setOptimizedPrompt,
    setIsOptimizing,
  ]);

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    const promptToUse = optimizedPrompt || originalPrompt;

    const testMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: "🧪 Running test execution...",
    };
    addMessage(testMsg);

    try {
      const res = await fetch("/api/v1/prompt-execution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: getContext(),
          prompt: promptToUse,
          expected_output: expectedOutput,
        }),
      });

      const data = await res.json();
      if (data.error) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Test failed: ${data.error}`,
        });
      } else {
        const output =
          typeof data.result === "string"
            ? data.result
            : JSON.stringify(data.result, null, 2);
        setActualOutput(output);
        setOutputTab("diff");
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "✅ Test complete. Showing **diff** view in the output panel.",
        });
      }
    } catch (err: any) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Test error: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  }, [
    optimizedPrompt,
    originalPrompt,
    expectedOutput,
    getContext,
    addMessage,
    setActualOutput,
    setOutputTab,
    setIsTesting,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOptimize();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900" style={{ width: "30%" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-900">
        <h2 className="text-sm font-semibold text-white">Prompt Coach</h2>
        <p className="text-xs text-gray-400 mt-0.5">Chat with AI to improve your prompt</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
            <div className="text-3xl mb-3">🤖</div>
            <p className="text-sm">
              Tell me what you&apos;d like to optimize, or just click{" "}
              <strong>Optimize</strong> to start.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700 p-3 bg-gray-900">
        <div className="bg-gray-800 rounded-lg border border-gray-600 focus-within:border-blue-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to improve... (Enter to optimize)"
            className="w-full bg-transparent text-white text-sm p-3 resize-none outline-none placeholder-gray-500 rounded-t-lg"
            rows={3}
          />
          <div className="flex justify-end gap-2 px-3 pb-2 pt-1">
            <button
              onClick={handleTest}
              disabled={isTesting || isOptimizing}
              className="px-3 py-1.5 text-xs font-medium rounded bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? "Testing..." : "Test"}
            </button>
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || isTesting}
              className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOptimizing ? "Optimizing..." : "Optimize"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Shift+Enter for new line · Enter to optimize
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-100 border border-gray-700"
        }`}
      >
        <MarkdownContent content={message.content} />
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {lines.map((line, i) => {
        if (line === "---") return <hr key={i} className="border-gray-600 my-2" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
            {i < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </div>
  );
}
