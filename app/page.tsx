"use client";
import DocumentSection from "./components/DocumentSection";
import PromptSection from "./components/PromptSection";
import ChatSection from "./components/ChatSection";
import StatusBar from "./components/StatusBar";

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
        <h1 className="text-base font-bold text-white tracking-tight">
          docu<span className="text-blue-400">·</span>dojo
        </h1>
        <span className="ml-3 text-xs text-gray-400">Prompt Engineering for Document Tasks</span>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        <DocumentSection />
        <PromptSection />
        <ChatSection />
      </main>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
