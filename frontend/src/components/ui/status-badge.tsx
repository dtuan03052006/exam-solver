import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Upload } from "lucide-react";

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  uploading: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Upload className="w-3 h-3" />, label: "Đang tải" },
  processing: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Đang phân tích" },
  completed: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: <CheckCircle2 className="w-3 h-3" />, label: "Hoàn tất" },
  failed: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="w-3 h-3" />, label: "Thất bại" },
};

interface StatusBadgeProps {
  status: string;
  errorMessage?: string;
  className?: string;
}

export function StatusBadge({ status, errorMessage, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.completed;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.color, className)}
      title={status === "failed" && errorMessage ? errorMessage : undefined}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
