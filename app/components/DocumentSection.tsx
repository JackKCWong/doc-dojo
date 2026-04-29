"use client";
import { useCallback, useRef, useState } from "react";
import { useAppStore, UploadedFile } from "../store";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  // Use pdfjs-dist to extract text
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  const textParts: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    textParts.push(`# page ${i}\n${pageText}`);
  }
  return { text: textParts.join("\n\n"), pageCount };
}

async function imageToPdfObjectUrl(file: File): Promise<string> {
  // Convert image to PDF using a canvas + PDF blob approach via pdfjs isn't possible,
  // so we'll embed the image in an HTML page for preview, and use blob URL directly for display.
  // For preview we'll use an iframe with the image wrapped in an HTML page.
  return URL.createObjectURL(file);
}

export default function DocumentSection() {
  const { files, selectedFileId, addFile, removeFile, selectFile, updateFileText } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [docTab, setDocTab] = useState<"preview" | "text">("preview");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFile = files.find((f) => f.id === selectedFileId) ?? null;

  const processFile = useCallback(
    async (rawFile: File) => {
      const isImage = rawFile.type.startsWith("image/");
      const isPdf = rawFile.type === "application/pdf";
      if (!isImage && !isPdf) return;

      const arrayBuffer = await rawFile.arrayBuffer();
      let url: string;
      let textContent = "";
      let pageCount = 1;

      if (isPdf) {
        url = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/pdf" }));
        try {
          const result = await extractTextFromPDF(arrayBuffer);
          textContent = result.text;
          pageCount = result.pageCount;
        } catch (_) {
          textContent = "";
        }
      } else {
        // Image: wrap in data URL for iframe preview
        url = URL.createObjectURL(rawFile);
        pageCount = 1;
      }

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: rawFile.name,
        type: isPdf ? "pdf" : "image",
        url,
        textContent,
        pageCount,
      };
      addFile(uploadedFile);
    },
    [addFile]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      for (const f of droppedFiles) await processFile(f);
    },
    [processFile]
  );

  const onFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      for (const f of selected) await processFile(f);
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="flex h-full" style={{ width: "30%" }}>
      {/* Vertical file tabs (10% of total = 1/3 of this section) */}
      <div className="flex flex-col bg-gray-900 border-r border-gray-700 overflow-y-auto" style={{ width: "33.33%" }}>
        <button
          className="p-2 text-xs text-blue-400 hover:text-blue-300 border-b border-gray-700 text-left"
          onClick={() => fileInputRef.current?.click()}
          title="Upload file"
        >
          + Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
        {files.map((f) => (
          <div
            key={f.id}
            className={`group flex flex-col px-2 py-2 cursor-pointer border-b border-gray-700 text-xs hover:bg-gray-700 ${
              selectedFileId === f.id ? "bg-gray-700 text-white" : "text-gray-400"
            }`}
            onClick={() => selectFile(f.id)}
            title={f.name}
          >
            <span className="truncate font-medium">{f.name}</span>
            <span className="text-gray-500 mt-0.5">{f.pageCount}p</span>
            <button
              className="mt-1 text-red-500 opacity-0 group-hover:opacity-100 text-left"
              onClick={(e) => {
                e.stopPropagation();
                removeFile(f.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Document area (20% of total = 2/3 of this section) */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {files.length === 0 || !selectedFile ? (
          /* Drop zone */
          <div
            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed m-3 rounded-lg transition-colors ${
              isDragging ? "border-blue-400 bg-blue-900/20" : "border-gray-600 bg-gray-900/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-400 text-sm text-center px-4">
              Drag & drop PDF or image files here
            </p>
            <p className="text-gray-500 text-xs mt-2">or click to browse</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-700 bg-gray-900">
              {(["preview", "text"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                    docTab === tab
                      ? "text-white border-b-2 border-blue-400 bg-gray-800"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => setDocTab(tab)}
                >
                  {tab === "text" ? "Text Content" : "Preview"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {docTab === "preview" ? (
                selectedFile.type === "pdf" ? (
                  <iframe
                    src={selectedFile.url}
                    className="w-full h-full border-0"
                    title={selectedFile.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 overflow-auto p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedFile.url}
                      alt={selectedFile.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
              ) : (
                <MonacoEditor
                  height="100%"
                  language="markdown"
                  theme="vs-dark"
                  value={selectedFile.textContent}
                  onChange={(val) => updateFileText(selectedFile.id, val ?? "")}
                  options={{
                    fontSize: 12,
                    wordWrap: "on",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* Always-visible drop zone overlay hint when files exist */}
        {files.length > 0 && (
          <div
            className={`border-t border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-300 transition-colors`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span>+</span>
            <span>Drop or click to add more files</span>
          </div>
        )}
      </div>
    </div>
  );
}
