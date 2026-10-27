"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { Sidebar } from "@/components/sidebar";
import { DocumentHub } from "@/components/document-hub";
import { ChatPanel } from "@/components/chat-panel";
import { SlideViewer } from "@/components/slide-viewer";

export default function DashboardPage() {
  const router = useRouter();
  const { activeView } = useAppStore();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) router.replace("/login");
  }, [router]);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {activeView === "documents" ? (
          <DocumentHub />
        ) : (
          <>
            <div className="w-[45%] min-w-[380px] border-r flex flex-col">
              <ChatPanel />
            </div>
            <div className="flex-1 flex flex-col">
              <SlideViewer />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

