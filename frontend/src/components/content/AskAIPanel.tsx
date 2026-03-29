"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import type { AskAIMessage } from "@/types";

const MAX_MESSAGES = 10;

const SUGGESTED_QUESTIONS = [
  "What are the key findings?",
  "Explain this for a beginner",
  "What are the treatment recommendations?",
  "What are the study limitations?",
];

interface AskAIPanelProps {
  contentId: number;
  onClose: () => void;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-0.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

function AIAvatar() {
  return (
    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
      <Sparkles className="h-3 w-3 text-white" />
    </div>
  );
}

export default function AskAIPanel({ contentId, onClose }: AskAIPanelProps) {
  const [messages, setMessages] = useState<AskAIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const limitReached = userMessageCount >= MAX_MESSAGES;
  const canSend = !!input.trim() && !loading && !limitReached;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || loading || limitReached) return;

    const userMsg: AskAIMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    const placeholderIndex = nextMessages.length;

    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      await apiClient.streamAskAI(contentId, text, messages, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[placeholderIndex] = {
            role: "assistant",
            content: (updated[placeholderIndex]?.content ?? "") + chunk,
          };
          return updated;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[placeholderIndex] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0 bg-gradient-to-r from-violet-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-900">Ask AI</span>
          <span className="text-xs text-zinc-400">· scoped to this article</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-xs text-zinc-400 text-center leading-relaxed">
              Ask anything about this article.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-2.5 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isStreaming = loading && i === messages.length - 1 && msg.role === "assistant";
            const isEmpty = !msg.content;

            return (
              <div
                key={i}
                className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                {msg.role === "assistant" && <AIAvatar />}
                <div
                  className={cn(
                    "max-w-[82%] rounded-xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-violet-600 text-white px-3.5 py-2.5"
                      : "bg-zinc-50 border border-zinc-100 text-zinc-800 px-3.5 py-2.5"
                  )}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : isEmpty && isStreaming ? (
                    <ThinkingDots />
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:my-1 prose-p:text-zinc-800 prose-strong:text-zinc-900">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {isStreaming && (
                        <span className="inline-block w-0.5 h-3.5 bg-zinc-400 ml-0.5 animate-pulse align-middle" />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 p-3 shrink-0">
        {limitReached ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <p className="text-xs text-zinc-500 text-center">
              Session limit reached. Reload to start a new conversation.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reload page
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (Enter to send)"
                rows={2}
                className="resize-none text-sm pr-11 rounded-xl border-zinc-200 focus-visible:ring-violet-500 focus-visible:border-violet-300"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!canSend}
                className={cn(
                  "absolute bottom-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150",
                  canSend
                    ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm active:scale-95"
                    : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                )}
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 text-right">
              {userMessageCount}/{MAX_MESSAGES} messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
