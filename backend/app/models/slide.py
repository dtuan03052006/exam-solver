from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.db.base import Base


class SlidePage(Base):
    __tablename__ = "slides_pages"

    id = Column(Integer, primary_key=True, index=True)
    chapter = Column(String, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    embedding = Column(Vector(768), nullable=True)

    course = relationship("Course", back_populates="slides")

    # Nếu dùng Gemini text-embedding-004 thì số chiều là 768
    # Nếu dùng OpenAI text-embedding-3-small thì số chiều là 1536