import { FileQuestion, MessageSquarePlus } from "lucide-react";

interface EmptyStateProps {
  type?: "documents" | "chat";
  title?: string;
  description?: string;
}

export function EmptyState({ type = "documents", title, description }: EmptyStateProps) {
  const isChat = type === "chat";
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-5">
        {isChat ? <MessageSquarePlus className="w-10 h-10 text-muted-foreground" /> : <FileQuestion className="w-10 h-10 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title || (isChat ? "Bắt đầu cuộc trò chuyện" : "Chưa có tài liệu nào")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {description || (isChat ? "Chọn một tài liệu và bắt đầu đặt câu hỏi cho AI" : "Tải lên tài liệu đầu tiên để bắt đầu")}
      </p>
    </div>
  );
}
