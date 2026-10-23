import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine
from app.api.slides import router as slides_router
from app.models.course import Course
from app.models.exam import ExamPaper, Question, Solution
from app.models.slide import SlidePage

# Tự động tạo các bảng trong Database nếu chưa có
try:
    Base.metadata.create_all(bind=engine)
except Exception as exc:  # pragma: no cover - cảnh báo dev nếu DB không khả dụng
    print(f"[WARN] Không thể kết nối DB ngay lúc khởi động: {exc}")

app = FastAPI(
    title="AI Past-Exam Solver API",
    description="Hệ thống giải đề thi cũ và định vị slide bài giảng bằng AI",
    version="1.0.0",
)

# 1. Cấu hình CORS (Cho phép Frontend Next.js gọi vào API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Khi làm thật với frontend sẽ đổi thành ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Tạo thư mục lưu ảnh và mở cổng static để Frontend xem được ảnh
os.makedirs("uploads/slides", exist_ok=True)
app.mount("/static/slides", StaticFiles(directory="uploads/slides"), name="slides")

# 3. Đăng ký router
app.include_router(slides_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "AI Exam Solver API đang chạy ổn định!"}
