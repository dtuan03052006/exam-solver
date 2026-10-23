from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)        # Ví dụ: "Giải tích 2"         # Ví dụ: "MI1120" (Mã học phần)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Quan hệ 1 - Nhiều (1 môn học có nhiều slide và nhiều đề thi)
    slides = relationship("SlidePage", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("ExamPaper", back_populates="course", cascade="all, delete-orphan")