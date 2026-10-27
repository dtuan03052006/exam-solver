"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  CheckCircle2,
  Image as ImageIcon,
  Maximize2,
  Zap,
  X,
  BookOpen,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
} from "lucide-react";

export interface Question {
  question_id: number;
  question_number: string;
  content: string;
  question_type: string;
  solution?: string;
  related_slides: { chapter?: string; page_number: number; image_url: string }[];
}

export function SplitView({
  questions,
  onSolveAll,
  onSolveSingle,
  isSolvingAll,
  solvingQuestionId,
}: {
  questions: Question[];
  onSolveAll: () => void;
  onSolveSingle: (questionId: number) => Promise<void>;
  isSolvingAll: boolean;
  solvingQuestionId: number | null;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showSlides, setShowSlides] = useState(true);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center rounded-3xl bg-white/40 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 ring-1 ring-red-500/30">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
          Chưa có câu hỏi đề thi nào
        </h3>
        <p className="text-sm text-slate-500 max-w-md">
          Hãy bấm vào nút <span className="text-red-600 dark:text-red-400 font-bold">&quot;Nạp Tài Liệu / Đề Thi&quot;</span> ở góc phải trên cùng để tải ảnh đề thi lên!
        </p>
      </div>
    );
  }

  const currentQ = questions[selectedIdx] || questions[0];
  const isSolvingCurrent = solvingQuestionId === currentQ.question_id;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      
      {/* CỘT TRÁI (5/12): Danh sách câu hỏi */}
      <div className="lg:col-span-5 flex flex-col rounded-3xl bg-white/75 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
            Danh sách câu hỏi ({questions.length})
          </span>
          <button
            onClick={onSolveAll}
            disabled={isSolvingAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {isSolvingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            {isSolvingAll ? "Đang giải cả đề..." : "Giải Toàn Bộ Đề"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {questions.map((q, idx) => {
            const isSelected = selectedIdx === idx;
            const hasSolution = Boolean(q.solution);
            const hasSlides = q.related_slides && q.related_slides.length > 0;

            return (
              <div
                key={q.question_id || idx}
                onClick={() => setSelectedIdx(idx)}
                className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 ${
                  isSelected
                    ? "bg-red-500/10 dark:bg-red-950/40 border-red-500 dark:border-red-500/80 shadow-md shadow-red-500/10 ring-1 ring-red-500"
                    : "bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-red-400/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-red-600 dark:text-red-400">
                    {q.question_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasSolution && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                        ✓ Đã giải
                      </span>
                    )}
                    {hasSlides && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                        {q.related_slides.length} slide
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {q.question_type === "quiz" ? "Trắc nghiệm" : "Tự luận"}
                    </span>
                  </div>
                </div>
                <div className="text-xs line-clamp-2 text-slate-600 dark:text-slate-300 font-normal">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {q.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CỘT PHẢI (7/12): Lời giải & Ảnh Slide Đối Chiếu */}
      <div className="lg:col-span-7 flex flex-col rounded-3xl bg-white/75 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-sm">
        
        {/* Thanh công cụ câu hỏi */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
              Chi tiết {currentQ.question_number}
            </span>
          </div>

          {/* Nút bấm giải nhanh bằng Groq LPU */}
          <button
            onClick={() => onSolveSingle(currentQ.question_id)}
            disabled={isSolvingCurrent}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSolvingCurrent ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-current" />
            )}
            {isSolvingCurrent ? "Groq đang giải..." : currentQ.solution ? "⚡ Giải lại câu này (Groq ~0.4s)" : "⚡ Giải câu này (Groq ~0.4s)"}
          </button>
        </div>

        {/* Nội dung câu hỏi và lời giải */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Hộp đề bài */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              Nội dung câu hỏi:
            </span>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {currentQ.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Hộp Lời giải Barem Điểm */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wide">
                <CheckCircle2 className="w-4 h-4" />
                LỜI GIẢI CHUẨN BAREM ĐIỂM
              </div>

              {currentQ.solution && (
                <button
                  onClick={() => onSolveSingle(currentQ.question_id)}
                  disabled={isSolvingCurrent}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition"
                  title="Giải lại câu này"
                >
                  <RotateCcw className="w-3 h-3" />
                  Làm mới
                </button>
              )}
            </div>
            
            {currentQ.solution ? (
              <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {currentQ.solution}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-xs text-slate-400 mb-3 italic">
                  Câu hỏi này chưa được giải.
                </p>
                <button
                  onClick={() => onSolveSingle(currentQ.question_id)}
                  disabled={isSolvingCurrent}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all"
                >
                  {isSolvingCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                  Bấm để giải ngay với Groq (~0.4s)
                </button>
              </div>
            )}
          </div>

          {/* Khối Trích dẫn Slide Bài Giảng có Toggle Ẩn / Hiện */}
          {currentQ.related_slides && currentQ.related_slides.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950/60 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 tracking-wide">
                  <ImageIcon className="w-4 h-4" />
                  CĂN CỨ SLIDE BÀI GIẢNG ĐỐI CHIẾU ({currentQ.related_slides.length} TRANG)
                </div>

                {/* NÚT BẤM BẬT / TẮT XEM SLIDE */}
                <button
                  onClick={() => setShowSlides(!showSlides)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                >
                  {showSlides ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Ẩn Slide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Xem Slide đối chiếu
                    </>
                  )}
                </button>
              </div>
              
              {showSlides && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-50 duration-200">
                  {currentQ.related_slides.map((s, idx) => {
                    const fullUrl = s.image_url.startsWith("http")
                      ? s.image_url
                      : `http://localhost:8000${s.image_url}`;
                    return (
                      <div
                        key={idx}
                        className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 shadow-sm"
                      >
                        <div className="p-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 flex justify-between">
                          <span className="truncate max-w-[160px]">{s.chapter || "Tài liệu"}</span>
                          <span className="text-red-600 dark:text-red-400 font-bold">Trang {s.page_number}</span>
                        </div>
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={fullUrl}
                            alt={`Slide trang ${s.page_number}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={() => setZoomImage(fullUrl)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                          >
                            <Maximize2 className="w-6 h-6 drop-shadow" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Zoom Toàn Màn Hình Ảnh Slide */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={zoomImage}
              alt="Phóng to slide"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl ring-2 ring-red-500/50 object-contain"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
