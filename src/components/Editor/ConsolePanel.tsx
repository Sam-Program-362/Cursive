"use client";

import React, { useState } from "react";
import { ExecutionResult, FileItem } from "@/types";
import {
  Terminal,
  Play,
  RotateCcw,
  Copy,
  Check,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface ConsolePanelProps {
  isOpen: boolean;
  result: ExecutionResult | null;
  isRunning: boolean;
  activeFile: FileItem | null;
  allFiles: FileItem[];
  stdin: string;
  setStdin: (val: string) => void;
  onRun: () => void;
  onClose: () => void;
  onClear: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  isOpen,
  result,
  isRunning,
  activeFile,
  allFiles,
  stdin,
  setStdin,
  onRun,
  onClose,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<"terminal" | "preview">("terminal");
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isWebFile =
    activeFile?.name.endsWith(".html") ||
    activeFile?.name.endsWith(".htm") ||
    activeFile?.language === "html";

  const handleCopy = () => {
    if (!result?.output) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Construct combined HTML for web live preview
  const getWebPreviewSrc = () => {
    if (!activeFile) return "";
    let html = activeFile.content;

    // If active file is HTML, inject linked CSS/JS files if present in workspace
    if (activeFile.name.endsWith(".html")) {
      const cssFiles = allFiles.filter((f) => f.name.endsWith(".css"));
      const jsFiles = allFiles.filter((f) => f.name.endsWith(".js"));

      for (const css of cssFiles) {
        html = html.replace(
          `<link rel="stylesheet" href="${css.name}" />`,
          `<style>${css.content}</style>`
        );
        html = html.replace(
          `<link rel="stylesheet" href="${css.path}" />`,
          `<style>${css.content}</style>`
        );
      }

      for (const js of jsFiles) {
        html = html.replace(
          `<script src="${js.name}"></script>`,
          `<script>${js.content}</script>`
        );
        html = html.replace(
          `<script src="${js.path}"></script>`,
          `<script>${js.content}</script>`
        );
      }
    }

    return html;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`border-t border-slate-800 bg-slate-950 flex flex-col transition-all duration-200 z-20 ${
        isExpanded ? "h-96 md:h-[480px]" : "h-64 md:h-72"
      }`}
    >
      {/* Console Top Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 select-none">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === "terminal"
                ? "bg-slate-800 text-blue-400 border border-slate-700/80 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal Output</span>
          </button>

          {isWebFile && (
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Preview</span>
            </button>
          )}
        </div>

        {/* Status Badges & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Execution Status Badge */}
          {isRunning ? (
            <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50 animate-pulse">
              Running...
            </span>
          ) : result?.status === "success" ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
              <CheckCircle2 className="w-3 h-3" />
              Exit {result.exitCode ?? 0}
            </span>
          ) : result?.status === "error" ? (
            <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/50">
              <AlertCircle className="w-3 h-3" />
              Error ({result.exitCode ?? 1})
            </span>
          ) : null}

          {/* Execution Time */}
          {result?.executionTime !== undefined && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              {result.executionTime}ms
            </span>
          )}

          {/* Clear Button */}
          <button
            type="button"
            onClick={onClear}
            title="Clear Console"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Output"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Expand/Collapse Height */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Console Drawer */}
          <button
            type="button"
            onClick={onClose}
            title="Close Console"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "terminal" ? (
          <div className="flex-1 flex flex-col overflow-hidden p-3 font-mono text-xs">
            {/* Output Scrollable Area */}
            <div className="flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed space-y-1">
              {isRunning && (
                <div className="text-blue-400 flex items-center gap-2">
                  <span className="animate-spin">🌀</span>
                  <span>Executing {activeFile?.name || "code"}...</span>
                </div>
              )}

              {result?.stdout && (
                <div className="text-slate-200">{result.stdout}</div>
              )}

              {result?.stderr && (
                <div className="text-red-400 bg-red-950/30 p-2 rounded border border-red-900/40">
                  {result.stderr}
                </div>
              )}

              {!isRunning && !result && (
                <div className="text-slate-600">
                  Click <strong className="text-slate-400">Run</strong> or press{" "}
                  <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">
                    Ctrl+Enter
                  </kbd>{" "}
                  to execute code and view output here.
                </div>
              )}
            </div>

            {/* Interactive Stdin Row */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 shrink-0">
              <span className="text-slate-500 text-[11px] shrink-0 font-medium">
                Standard Input (stdin):
              </span>
              <input
                type="text"
                placeholder="Optional input passed to program..."
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRun();
                }}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={onRun}
                disabled={isRunning}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold shrink-0 transition-colors"
              >
                Run
              </button>
            </div>
          </div>
        ) : (
          /* Web Preview Iframe */
          <div className="flex-1 w-full h-full bg-white">
            <iframe
              srcDoc={getWebPreviewSrc()}
              title="Web Preview"
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
