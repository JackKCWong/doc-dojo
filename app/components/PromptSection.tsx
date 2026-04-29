"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "../store";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  { ssr: false }
);

type PromptTab = "original" | "optimized" | "diff";
type OutputTab = "expected" | "actual" | "diff";

const EDITOR_OPTIONS = {
  fontSize: 12,
  wordWrap: "on" as const,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: "on" as const,
};

export default function PromptSection() {
  const {
    originalPrompt,
    optimizedPrompt,
    expectedOutput,
    actualOutput,
    setOriginalPrompt,
    setExpectedOutput,
  } = useAppStore();

  const [promptTab, setPromptTab] = useState<PromptTab>("original");
  const [outputTab, setOutputTab] = useState<OutputTab>("expected");

  return (
    <div className="flex flex-col h-full border-x border-gray-700" style={{ width: "40%" }}>
      {/* Prompt Editors — top 60% */}
      <div className="flex flex-col border-b border-gray-700" style={{ height: "60%" }}>
        <div className="flex items-center border-b border-gray-700 bg-gray-900">
          <span className="px-3 py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Prompt
          </span>
          <div className="flex ml-2">
            {(["original", "optimized", "diff"] as PromptTab[]).map((tab) => (
              <button
                key={tab}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  promptTab === tab
                    ? "text-white border-b-2 border-blue-400 bg-gray-800"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setPromptTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {promptTab === "original" && (
            <MonacoEditor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={originalPrompt}
              onChange={(val) => setOriginalPrompt(val ?? "")}
              options={EDITOR_OPTIONS}
            />
          )}
          {promptTab === "optimized" && (
            <MonacoEditor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={optimizedPrompt || "// Optimized prompt will appear here after clicking Optimize"}
              options={{ ...EDITOR_OPTIONS, readOnly: true }}
            />
          )}
          {promptTab === "diff" && (
            <MonacoDiffEditor
              height="100%"
              language="markdown"
              theme="vs-dark"
              original={originalPrompt}
              modified={optimizedPrompt}
              options={{ ...EDITOR_OPTIONS, readOnly: true, renderSideBySide: true }}
            />
          )}
        </div>
      </div>

      {/* Output Editors — bottom 40% */}
      <div className="flex flex-col" style={{ height: "40%" }}>
        <div className="flex items-center border-b border-gray-700 bg-gray-900">
          <span className="px-3 py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Output
          </span>
          <div className="flex ml-2">
            {(["expected", "actual", "diff"] as OutputTab[]).map((tab) => (
              <button
                key={tab}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  outputTab === tab
                    ? "text-white border-b-2 border-green-400 bg-gray-800"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setOutputTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {outputTab === "expected" && (
            <MonacoEditor
              height="100%"
              language="json"
              theme="vs-dark"
              value={expectedOutput}
              onChange={(val) => setExpectedOutput(val ?? "")}
              options={EDITOR_OPTIONS}
            />
          )}
          {outputTab === "actual" && (
            <MonacoEditor
              height="100%"
              language="json"
              theme="vs-dark"
              value={actualOutput || "// Actual output will appear here after clicking Test"}
              options={{ ...EDITOR_OPTIONS, readOnly: true }}
            />
          )}
          {outputTab === "diff" && (
            <MonacoDiffEditor
              height="100%"
              language="json"
              theme="vs-dark"
              original={expectedOutput}
              modified={actualOutput}
              options={{ ...EDITOR_OPTIONS, readOnly: true, renderSideBySide: true }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
