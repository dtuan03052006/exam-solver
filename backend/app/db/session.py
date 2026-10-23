import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(raw_url: str | None) -> str:
    if not raw_url:
        raise RuntimeError(
            "DATABASE_URL chưa được cấu hình. Hãy thiết lập biến môi trường DATABASE_URL."
        )

    sanitized = raw_url.strip()
    if "@" not in sanitized:
        return sanitized

    scheme, rest = sanitized.split("://", 1)
    auth, host = rest.rsplit("@", 1)
    if ":" in auth:
        username, password = auth.split(":", 1)
        password = password.strip("[] ")
        auth = f"{username}:{password}"
    if scheme == "postgresql":
        scheme = "postgresql+psycopg2"
    return f"{scheme}://{auth}@{host}"


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency của FastAPI: Mỗi request mở 1 session, xử lý xong tự động đóng
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
