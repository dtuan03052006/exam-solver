"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { X, Upload, FileUp, Loader2 } from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState("");
  const [folderName, setFolderName] = useState("Mặc định");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !courseName.trim()) throw new Error("Thiếu thông tin");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("course_name", courseName.trim());
      fd.append("folder_name", folderName.trim() || "Mặc định");
      if (tagsInput.trim()) fd.append("tags", tagsInput.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("background", "true");
      return docsAPI.upload(fd, setProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setFile(null);
    setCourseName("");
    setFolderName("Mặc định");
    setTagsInput("");
    setDescription("");
    setProgress(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border rounded-2xl w-full max-w-lg mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Tải lên tài liệu</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : file ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileUp className="w-8 h-8 text-emerald-600" />
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Kéo thả file hoặc click để chọn</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD</p>
            </>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Tên tài liệu / Môn học *</label>
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="VD: Hệ điều hành, Giải tích 2..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Thư mục</label>
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Mặc định"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="tag1, tag2, ..."
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Mô tả ngắn gọn về tài liệu..."
            />
          </div>
        </div>

        {uploadMutation.isPending && progress > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
          </div>
        )}

        {uploadMutation.isError && (
          <p className="mt-3 text-sm text-destructive">{(uploadMutation.error as Error).message}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Hủy</button>
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !courseName.trim() || uploadMutation.isPending}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Tải lên
          </button>
        </div>
      </div>
    </div>
  );
}
