"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { DocumentCard } from "@/components/document-card";
import { UploadDialog } from "@/components/upload-dialog";
import { EditDocumentDialog } from "@/components/edit-document-dialog";
import { Pagination } from "@/components/ui/pagination";
import { DocumentCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Upload, Filter, LayoutGrid, List, X } from "lucide-react";
import type { Document, PaginatedResponse, FolderInfo, TagInfo } from "@/types";

export function DocumentHub() {
  const { setSelectedDocument, setActiveView } = useAppStore();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [tag, setTag] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, folder, tag, statusFilter, pageSize]);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: [
      "documents",
      {
        q: debouncedSearch,
        folder_name: folder,
        tag,
        status: statusFilter,
        page,
        page_size: pageSize,
      },
    ],
    queryFn: () =>
      docsAPI
        .list({
          ...(debouncedSearch && { q: debouncedSearch }),
          ...(folder && { folder_name: folder }),
          ...(tag && { tag }),
          ...(statusFilter && { status: statusFilter }),
          page,
          page_size: pageSize,
          sort_by: "created_at",
          sort_order: "desc",
        })
        .then((r) => r.data),
  });

  const { data: folders } = useQuery<FolderInfo[]>({
    queryKey: ["folders"],
    queryFn: () => docsAPI.folders().then((r) => r.data),
  });

  const { data: tags } = useQuery<TagInfo[]>({
    queryKey: ["tags"],
    queryFn: () => docsAPI.tags().then((r) => r.data),
  });

  const processingIds =
    data?.items
      .filter((d) => d.status === "processing" || d.status === "uploading")
      .map((d) => d.id) || [];

  useEffect(() => {
    if (processingIds.length === 0) return;
    const interval = setInterval(() => {
      processingIds.forEach((id) => docsAPI.status(id));
    }, 2500);
    return () => clearInterval(interval);
  }, [processingIds.join(",")]);

  const handleChat = (doc: Document) => {
    setSelectedDocument(doc);
    setActiveView("chat");
  };

  const hasFilters = folder || tag || statusFilter;
  const clearFilters = () => {
    setFolder("");
    setTag("");
    setStatusFilter("");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b bg-card space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài liệu theo tên, mô tả hoặc tag..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-muted text-primary" : "hover:bg-muted/50"}`}
                title="Lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-muted text-primary" : "hover:bg-muted/50"}`}
                title="Danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Tải lên tài liệu
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="h-8 px-3 rounded-md border bg-background text-xs"
          >
            <option value="">Tất cả thư mục</option>
            {folders?.map((f) => (
              <option key={f.folder_name} value={f.folder_name}>
                {f.folder_name} ({f.document_count})
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-8 px-3 rounded-md border bg-background text-xs"
          >
            <option value="">Tất cả tags</option>
            {tags?.map((t) => (
              <option key={t.tag} value={t.tag}>
                {t.tag} ({t.document_count})
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 rounded-md border bg-background text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="uploading">Đang tải</option>
            <option value="processing">Đang phân tích</option>
            <option value="completed">Hoàn tất</option>
            <option value="failed">Thất bại</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-8 px-2 rounded-md hover:bg-muted text-xs flex items-center gap-1 text-muted-foreground"
            >
              <X className="w-3 h-3" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                : "space-y-3"
            }
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState />
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  : "space-y-3"
              }
            >
              {data.items.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onChat={handleChat}
                  onEdit={(d) => setEditDoc(d)}
                />
              ))}
            </div>
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              total={data.total}
            />
          </>
        )}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <EditDocumentDialog doc={editDoc} onClose={() => setEditDoc(null)} />
    </div>
  );
}

