import { create } from "zustand";
import type { ChatSession, Document } from "@/types";

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  activeView: "documents" | "chat";
  setActiveView: (v: "documents" | "chat") => void;

  selectedDocument: Document | null;
  setSelectedDocument: (doc: Document | null) => void;

  viewerPage: number;
  setViewerPage: (p: number) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  chatSessions: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (id: string, updates: Partial<ChatSession>) => void;
  removeChatSession: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeView: "documents",
  setActiveView: (v) => set({ activeView: v }),

  selectedDocument: null,
  setSelectedDocument: (doc) => set({ selectedDocument: doc, viewerPage: 1 }),

  viewerPage: 1,
  setViewerPage: (p) => set({ viewerPage: p }),

  darkMode: false,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
      }
      return { darkMode: next };
    }),

  chatSessions: [],
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),
  addChatSession: (session) =>
    set((s) => ({ chatSessions: [session, ...s.chatSessions] })),
  updateChatSession: (id, updates) =>
    set((s) => ({
      chatSessions: s.chatSessions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  removeChatSession: (id) =>
    set((s) => ({
      chatSessions: s.chatSessions.filter((c) => c.id !== id),
      activeChatId: s.activeChatId === id ? null : s.activeChatId,
    })),
}));
