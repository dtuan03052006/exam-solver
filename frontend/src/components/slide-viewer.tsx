"use client";

import { useQuery } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { DocumentDetail } from "@/types";

const STATIC_URL = process.env.NEXT_PUBLIC_STATIC_URL || "http://localhost:8000";

export function SlideViewer() {
  const { selectedDocument, viewerPage, setViewerPage } = useAppStore();
  const [zoom, setZoom] = useState(100);
  const imageRef = useRef<HTMLDivElement>(null);

  const { data: detail } = useQuery<DocumentDetail>({
    queryKey: ["doc-detail", selectedDocument?.id],
    queryFn: () => docsAPI.detail(selectedDocument!.id).then((r) => r.data),
    enabled: !!selectedDocument?.id,
  });

  const slides = detail?.slides || [];
  const totalPages = slides.length;
  const currentSlide = slides.find((s) => s.page_number === viewerPage) || slides[0];

  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [viewerPage]);

  if (!selectedDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Chọn tài liệu để xem nội dung</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-muted/20">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewerPage(Math.max(1, viewerPage - 1))}
            disabled={viewerPage <= 1}
            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            Trang {viewerPage} / {totalPages || "—"}
          </span>
          <button
            onClick={() => setViewerPage(Math.min(totalPages, viewerPage + 1))}
            disabled={viewerPage >= totalPages}
            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(50, zoom - 25))} className="p-1.5 rounded-md hover:bg-muted"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs min-w-[40px] text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1.5 rounded-md hover:bg-muted"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => setZoom(100)} className="p-1.5 rounded-md hover:bg-muted"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>
      <div ref={imageRef} className="flex-1 overflow-auto p-4 flex items-start justify-center">
        {currentSlide?.image_url ? (
          <img
            src={`${STATIC_URL}${currentSlide.image_url}`}
            alt={`Trang ${viewerPage}`}
            className="rounded-lg shadow-md transition-transform duration-200"
            style={{ width: `${zoom}%`, maxWidth: `${zoom}%` }}
          />
        ) : (
          <div className="bg-card border rounded-lg p-8 max-w-2xl w-full">
            <p className="text-sm whitespace-pre-wrap">{detail?.name || "Không có nội dung xem trước"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
