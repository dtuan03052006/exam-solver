import os
import sys
from pathlib import Path


from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import DB_INIT_ERROR, engine

from app.api.slides import router as slides_router
from app.api.exam import router as exam_router
from app.api.auth import router as auth_router


from app.models.course import Course
from app.models.exam import ExamPaper, Question, Solution
from app.models.slide import SlidePage
from app.models.user import User

from dotenv import load_dotenv
load_dotenv()
# Tự động kích hoạt pgvector và tạo các bảng trong Database nếu chưa có
try:
    if engine is not None:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
                        ALTER TABLE courses ADD COLUMN IF NOT EXISTS folder_name VARCHAR(100) DEFAULT 'Mặc định' NOT NULL;
                        ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags JSON DEFAULT '[]'::json;
                        ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'completed' NOT NULL;
                        ALTER TABLE courses ADD COLUMN IF NOT EXISTS error_message VARCHAR(500);
                        ALTER TABLE courses ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'pdf';
                    END IF;
                END $$;
            """))
            conn.commit()
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



