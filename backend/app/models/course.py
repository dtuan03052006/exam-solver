from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)        # Tên môn học / tài liệu
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Bước 3: Phân loại theo thư mục và Tags
    folder_name = Column(String(100), default="Mặc định", index=True, nullable=False)
    tags = Column(JSON, default=list, nullable=True)

    # Bước 5: Theo dõi trạng thái xử lý (pending, processing, completed, failed)
    status = Column(String(30), default="completed", nullable=False)
    error_message = Column(String(500), nullable=True)
    file_type = Column(String(20), default="pdf", nullable=True)

    # Quan hệ 1 - Nhiều (Xóa Course sẽ tự động dọn sạch toàn bộ Slide và Đề thi liên quan)
    slides = relationship("SlidePage", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("ExamPaper", back_populates="course", cascade="all, delete-orphan")
