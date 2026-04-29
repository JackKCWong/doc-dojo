"use client";
import { create } from "zustand";

export interface UploadedFile {
  id: string;
  name: string;
  type: "pdf" | "image";
  url: string; // object URL
  textContent: string;
  pageCount: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "reasoning" | "prompt";
}

interface AppState {
  // Documents
  files: UploadedFile[];
  selectedFileId: string | null;
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string) => void;
  updateFileText: (id: string, text: string) => void;

  // Prompts
  originalPrompt: string;
  optimizedPrompt: string;
  setOriginalPrompt: (p: string) => void;
  setOptimizedPrompt: (p: string) => void;

  // Outputs
  expectedOutput: string;
  actualOutput: string;
  setExpectedOutput: (o: string) => void;
  setActualOutput: (o: string) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  clearMessages: () => void;

  // UI state
  isOptimizing: boolean;
  isTesting: boolean;
  setIsOptimizing: (v: boolean) => void;
  setIsTesting: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  files: [],
  selectedFileId: null,
  addFile: (file) =>
    set((s) => ({ files: [...s.files, file], selectedFileId: file.id })),
  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      selectedFileId: s.selectedFileId === id ? null : s.selectedFileId,
    })),
  selectFile: (id) => set({ selectedFileId: id }),
  updateFileText: (id, text) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, textContent: text } : f)),
    })),

  originalPrompt:
    "Extract the following information from the document:\n\n{{context}}\n\nProvide the result as JSON.",
  optimizedPrompt: "",
  setOriginalPrompt: (p) => set({ originalPrompt: p }),
  setOptimizedPrompt: (p) => set({ optimizedPrompt: p }),

  expectedOutput: '{\n  "field": "value"\n}',
  actualOutput: "",
  setExpectedOutput: (o) => set({ expectedOutput: o }),
  setActualOutput: (o) => set({ actualOutput: o }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content };
          return { messages: msgs };
        }
      }
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),

  isOptimizing: false,
  isTesting: false,
  setIsOptimizing: (v) => set({ isOptimizing: v }),
  setIsTesting: (v) => set({ isTesting: v }),
}));
