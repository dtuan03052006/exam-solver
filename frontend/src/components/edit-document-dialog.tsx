"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { X, Save, Loader2 } from "lucide-react";
import type { Document } from "@/types";

interface EditDocumentDialogProps {
  doc: Document | null;
  onClose: () => void;
}

export function EditDocumentDialog({ doc, onClose }: EditDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (doc) {
      setName(doc.name);
      setFolderName(doc.folder_name);
      setTagsStr(doc.tags?.join(", ") || "");
      setDescription(doc.description || "");
    }
  }, [doc]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!doc) throw new Error("No document");
      return docsAPI.update(doc.id, {
        name: name.trim(),
        folder_name: folderName.trim(),
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        description: description.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onClose();
    },
  });

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Chỉnh sửa tài liệu</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Tên tài liệu</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Thư mục</label>
            <input value={folderName} onChange={(e) => setFolderName(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tags (phân cách bằng dấu phẩy)</label>
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="tag1, tag2, tag3" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-20 px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        {mutation.isError && <p className="mt-3 text-sm text-destructive">{(mutation.error as Error).message}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border text-sm font-medium hover:bg-muted">Hủy</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
