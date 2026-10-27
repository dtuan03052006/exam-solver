"use client";

import { useQuery } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import {
  BookOpen, MessageSquare, FolderOpen, Plus, ChevronLeft, ChevronRight,
  Sun, Moon, LogOut, Trash2, PanelLeftClose, PanelLeft,
} from "lucide-react";
import type { FolderInfo, ChatSession } from "@/types";
import type { User } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Sidebar() {
  const router = useRouter();
  const {
    sidebarOpen, toggleSidebar, activeView, setActiveView,
    darkMode, toggleDarkMode, chatSessions, activeChatId,
    setActiveChatId, addChatSession, removeChatSession,
  } = useAppStore();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const { data: folders } = useQuery<FolderInfo[]>({
    queryKey: ["folders"],
    queryFn: () => docsAPI.folders().then((r) => r.data),
  });

  const handleNewChat = () => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: "Cuộc trò chuyện mới",
      course_name: "",
      messages: [],
      created_at: new Date(),
    };
    addChatSession(session);
    setActiveChatId(session.id);
    setActiveView("chat");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className={`flex flex-col border-r bg-card transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16"}`}>
      <div className="flex items-center gap-3 p-4 border-b">
        {sidebarOpen && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BookOpen className="w-6 h-6 text-primary flex-shrink-0" />
            <span className="font-bold text-sm truncate">AI Knowledge Hub</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-muted flex-shrink-0">
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-2 space-y-1">
        <button
          onClick={() => setActiveView("documents")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === "documents" ? "bg-primary/10 text-primary" : "hover:bg-muted"
          }`}
        >
          <FolderOpen className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Tài liệu</span>}
        </button>
        <button
          onClick={() => setActiveView("chat")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === "chat" ? "bg-primary/10 text-primary" : "hover:bg-muted"
          }`}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Chat AI</span>}
        </button>
      </div>

      {sidebarOpen && (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          <div>
            <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thư mục</h4>
            {folders?.map((f) => (
              <button key={f.folder_name} onClick={() => setActiveView("documents")} className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm hover:bg-muted">
                <span className="truncate">{f.folder_name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{f.document_count}</span>
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lịch sử Chat</h4>
              <button onClick={handleNewChat} className="p-1 rounded hover:bg-muted"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            {chatSessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer ${
                  activeChatId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
                onClick={() => { setActiveChatId(s.id); setActiveView("chat"); }}
              >
                <span className="truncate flex-1">{s.title}</span>
                <button onClick={(e) => { e.stopPropagation(); removeChatSession(s.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted-foreground/10">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto border-t p-3 space-y-2">
        {sidebarOpen && user && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {user.username?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-sm truncate flex-1">{user.full_name || user.username}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={toggleDarkMode} className="flex-1 flex items-center justify-center gap-2 h-8 rounded-lg hover:bg-muted text-sm">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {sidebarOpen && <span>{darkMode ? "Sáng" : "Tối"}</span>}
          </button>
          <button onClick={logout} className="flex-1 flex items-center justify-center gap-2 h-8 rounded-lg hover:bg-muted text-sm text-destructive">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Thoát</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
