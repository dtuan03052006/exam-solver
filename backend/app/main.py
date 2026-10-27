import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Tìm và nạp .env
base_dirs = [
    Path(__file__).resolve().parents[2],
    Path(__file__).resolve().parents[1],
]
for d in base_dirs:
    env_file = d / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        break
load_dotenv()

from app.db.base import Base
from app.db.session import DB_INIT_ERROR, engine

from app.api.slides import router as slides_router
from app.api.exam import router as exam_router
from app.api.auth import router as auth_router

from app.models.course import Course
from app.models.exam import ExamPaper, Question, Solution
from app.models.slide import SlidePage
from app.models.user import User

# Đồng bộ Database khi khởi động
try:
    if engine is not None:
        from sqlalchemy import text

        # 1. Kích hoạt extension vector nếu có thể
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
        except Exception:
            pass

        # 2. Tạo tất cả các bảng nếu chưa có
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as exc_create:
            print(f"[WARN] Lỗi khi tạo bảng: {exc_create}")

        # 3. Đồng bộ bổ sung các cột mới cho bảng courses nếu bảng đã tồn tại từ trước
        columns_to_add = [
            ("folder_name", "VARCHAR(100) DEFAULT 'Mặc định' NOT NULL"),
            ("tags", "JSON DEFAULT '[]'::json"),
            ("status", "VARCHAR(30) DEFAULT 'completed' NOT NULL"),
            ("error_message", "VARCHAR(500)"),
            ("file_type", "VARCHAR(20) DEFAULT 'pdf'"),
        ]
        with engine.connect() as conn:
            for col_name, col_def in columns_to_add:
                try:
                    conn.execute(text(f"ALTER TABLE courses ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                    conn.commit()
                except Exception:
                    conn.rollback()

        print("[INFO] Đã kết nối Database thành công và đồng bộ cấu trúc bảng.")
    elif DB_INIT_ERROR is not None:
        print(f"[WARN] Không thể kết nối DB ngay lúc khởi động: {DB_INIT_ERROR}")
except Exception as exc:
    print(f"[WARN] Không thể kết nối DB ngay lúc khởi động: {exc}")

app = FastAPI(
    title="PTIT Exam Solver API",
    description="Hệ thống giải đề thi cũ và định vị slide bài giảng bằng AI",
    version="1.0.0",
)

# 1. Cấu hình CORS (Cho phép Frontend Next.js gọi vào API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Tạo thư mục lưu ảnh và mở cổng static để Frontend xem được ảnh
os.makedirs("uploads/slides", exist_ok=True)
app.mount("/static/slides", StaticFiles(directory="uploads/slides"), name="slides")

# 3. Đăng ký router
app.include_router(slides_router, prefix="/api/v1")
app.include_router(exam_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"status": "PTIT Exam Solver API đang chạy ổn định!"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
