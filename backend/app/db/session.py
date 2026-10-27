import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")

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
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300,
            connect_args={"connect_timeout": 10}
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
