"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { chatAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Send, Loader2, Sparkles, FileText, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChatMessage, SlideInfo } from "@/types";

const SUGGESTIONS = [
  "Tóm tắt nội dung chính của tài liệu này",
  "Giải thích các khái niệm quan trọng",
  "Liệt kê các công thức trong tài liệu",
];

export function ChatPanel() {
  const {
    selectedDocument, setViewerPage,
    chatSessions, activeChatId, updateChatSession, setActiveChatId, addChatSession, setActiveView,
  } = useAppStore();

  const activeSession = chatSessions.find((s) => s.id === activeChatId);
  const messages = activeSession?.messages || [];

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const courseName = selectedDocument?.name || activeSession?.course_name || "";
      const { data } = await chatAPI.askFree({ course: courseName, question_text: question });
      return data;
    },
    onMutate: (question) => {
      let sessionId = activeChatId;
      if (!sessionId) {
        const session = {
          id: crypto.randomUUID(),
          title: question.slice(0, 40) + (question.length > 40 ? "..." : ""),
          course_name: selectedDocument?.name || "",
          course_id: selectedDocument?.id,
          messages: [] as ChatMessage[],
          created_at: new Date(),
        };
        addChatSession(session);
        setActiveChatId(session.id);
        sessionId = session.id;
      }
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question, timestamp: new Date() };
      updateChatSession(sessionId, {
        messages: [...(chatSessions.find((s) => s.id === sessionId)?.messages || []), userMsg],
      });
    },
    onSuccess: (data) => {
      if (!activeChatId) return;
      const session = chatSessions.find((s) => s.id === activeChatId);
      if (!session) return;
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.solution || "Không có câu trả lời.",
        related_slides: data.related_slides || [],
        timestamp: new Date(),
      };
      updateChatSession(activeChatId, { messages: [...session.messages, aiMsg] });
    },
  });

  const handleSend = () => {
    const q = input.trim();
    if (!q || askMutation.isPending) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    askMutation.mutate(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 150) + "px"; }
  };

  const handleCitationClick = (slide: SlideInfo) => {
    setViewerPage(slide.page_number);
  };

  const clearChat = () => {
    if (activeChatId) updateChatSession(activeChatId, { messages: [] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          <h3 className="text-sm font-semibold truncate">
            {selectedDocument ? `Chat: ${selectedDocument.name}` : activeSession?.title || "AI Chat"}
          </h3>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-muted" title="Xóa chat">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyState type="chat" />
            {selectedDocument && (
              <div className="flex flex-wrap gap-2 mt-6 max-w-md justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="px-3 py-2 rounded-lg border text-xs hover:bg-muted transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5" : ""}`}>
                {msg.role === "assistant" ? (
                  <div className="space-y-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.related_slides && msg.related_slides.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                        {msg.related_slides.map((slide) => (
                          <button
                            key={slide.id}
                            onClick={() => handleCitationClick(slide)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            {slide.chapter ? `${slide.chapter} - ` : ""}Trang {slide.page_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {askMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-3 bg-muted/50 rounded-2xl rounded-tl-md">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang suy nghĩ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-card p-4">
        <div className="flex items-end gap-2 bg-background border rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={selectedDocument ? "Hỏi về tài liệu này..." : "Chọn tài liệu hoặc nhập câu hỏi..."}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1.5 max-h-[150px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || askMutation.isPending}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
