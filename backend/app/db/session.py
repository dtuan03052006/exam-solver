import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Tìm file .env ở thư mục gốc Exam-Solver hoặc backend
base_dirs = [
    Path(__file__).resolve().parents[3],
    Path(__file__).resolve().parents[2],
]
for d in base_dirs:
    env_file = d / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        break
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = None
SessionLocal = None
DB_INIT_ERROR = None

if not DATABASE_URL:
    DB_INIT_ERROR = RuntimeError(
        "Thiếu biến môi trường DATABASE_URL. Không thể khởi tạo kết nối DB."
    )
else:
    try:
        connect_args = {"connect_timeout": 10}
        # Tương thích với Supabase PgBouncer Transaction Pooler (port 6543)
        if ":6543" in DATABASE_URL or "pooler.supabase.com" in DATABASE_URL:
            connect_args["prepare_threshold"] = None

        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300,
            connect_args=connect_args,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as exc:
        DB_INIT_ERROR = exc


def get_db():
    """
    Dependency của FastAPI: Mỗi request mở 1 session, xử lý xong tự động đóng
    """
    if SessionLocal is None:
        raise RuntimeError(f"Database chưa sẵn sàng: {DB_INIT_ERROR}")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
