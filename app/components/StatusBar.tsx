"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "../store";

function countTokensApprox(text: string): number {
  // Rough approximation: ~4 chars per token (tiktoken is not usable client-side easily)
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export default function StatusBar() {
  const { files, selectedFileId, originalPrompt, optimizedPrompt, expectedOutput } = useAppStore();
  const selectedFile = files.find((f) => f.id === selectedFileId);

  const [stats, setStats] = useState({
    pages: 0,
    contextTokens: 0,
    originalTokens: 0,
    optimizedTokens: 0,
    expectedTokens: 0,
  });

  useEffect(() => {
    setStats({
      pages: selectedFile?.pageCount ?? 0,
      contextTokens: countTokensApprox(selectedFile?.textContent ?? ""),
      originalTokens: countTokensApprox(originalPrompt),
      optimizedTokens: countTokensApprox(optimizedPrompt),
      expectedTokens: countTokensApprox(expectedOutput),
    });
  }, [selectedFile, originalPrompt, optimizedPrompt, expectedOutput]);

  const items = [
    { label: "Pages", value: stats.pages },
    { label: "Context tokens", value: stats.contextTokens.toLocaleString() },
    { label: "Original prompt tokens", value: stats.originalTokens.toLocaleString() },
    { label: "Optimized prompt tokens", value: stats.optimizedTokens.toLocaleString() },
    { label: "Expected output tokens", value: stats.expectedTokens.toLocaleString() },
  ];

  return (
    <div className="h-7 flex items-center bg-gray-950 border-t border-gray-700 px-4 gap-6 text-xs text-gray-400 select-none shrink-0">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-gray-600">{item.label}:</span>
          <span className="text-gray-300 font-mono">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
