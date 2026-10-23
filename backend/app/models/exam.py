from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class ExamPaper(Base):
    __tablename__ = "exam_papers"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)       # Ví dụ: "Đề thi cuối kỳ 20241"
    year = Column(Integer, nullable=True)             # 2024
    semester = Column(String(20), nullable=True)      # Học kỳ 1 / Học kỳ 2
    raw_file_url = Column(String(500), nullable=True) # Link ảnh/PDF đề thi gốc

    # Quan hệ
    course = relationship("Course", back_populates="exams")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exam_papers.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(String(20), nullable=False) # "Câu 1", "Câu 2a"
    content = Column(Text, nullable=False)               # Nội dung câu hỏi (chứa LaTeX/Markdown)
    question_type = Column(String(50), default="essay")  # "essay" (tự luận) hoặc "quiz" (trắc nghiệm)

    # Quan hệ
    exam = relationship("ExamPaper", back_populates="questions")
    solution = relationship("Solution", back_populates="question", uselist=False, cascade="all, delete-orphan")


class Solution(Base):
    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    content = Column(Text, nullable=False)       # Lời giải chi tiết từng bước (LaTeX)
    
    # Kỹ thuật quan trọng: Lưu danh sách ID các slide liên quan để giao diện hiển thị
    # Ví dụ: [12, 13] -> Nghĩa là liên quan đến trang slide số 12 và 13
    related_slide_ids = Column(JSON, nullable=True) 

    question = relationship("Question", back_populates="solution")