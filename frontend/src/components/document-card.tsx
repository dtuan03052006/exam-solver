"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { formatDate, getFileIcon } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { MoreHorizontal, Trash2, Edit3, MessageSquare, FolderOpen } from "lucide-react";
import type { Document } from "@/types";

interface DocumentCardProps {
  doc: Document;
  onChat: (doc: Document) => void;
  onEdit: (doc: Document) => void;
}

export function DocumentCard({ doc, onChat, onEdit }: DocumentCardProps) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => docsAPI.remove(doc.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  return (
    <div className="group bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="text-2xl flex-shrink-0 mt-0.5">{getFileIcon(doc.file_type)}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{doc.name}</h3>
            {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-card border rounded-lg shadow-lg py-1 w-44">
                <button onClick={() => { onChat(doc); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat với tài liệu
                </button>
                <button onClick={() => { onEdit(doc); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
                <hr className="my-1" />
                <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" /> Xóa tài liệu
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <FolderOpen className="w-3 h-3" />
        <span>{doc.folder_name}</span>
        <span>·</span>
        <span>{doc.total_pages} trang</span>
      </div>

      {doc.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {doc.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</span>
        <StatusBadge status={doc.status} errorMessage={doc.error_message} />
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-card border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="font-semibold mb-2">Xóa tài liệu?</h3>
            <p className="text-sm text-muted-foreground mb-5">Tài liệu &quot;{doc.name}&quot; sẽ bị xóa vĩnh viễn cùng toàn bộ slide và dữ liệu liên quan.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="h-9 px-4 rounded-lg border text-sm hover:bg-muted">Hủy</button>
              <button
                onClick={() => { deleteMutation.mutate(); setConfirmDelete(false); }}
                className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
