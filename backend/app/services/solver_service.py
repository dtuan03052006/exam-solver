import os
import re

from dotenv import load_dotenv
from groq import Groq
from sqlalchemy.orm import Session

from app.models.exam import Question
from app.models.slide import SlidePage

load_dotenv()


def _fallback_text_search(db: Session, course_id: int, question_text: str, top_k: int = 2) -> list[SlidePage]:
   if not course_id or not question_text:
       return []

   normalized = re.split(r"\s+|[^\w\u0100-\uFFFF]+", question_text.strip().lower())
   keywords = [term for term in normalized if term and len(term) > 1]
   if not keywords:
       return []

   query = db.query(SlidePage).filter(SlidePage.course_id == course_id)
   for keyword in keywords[:5]:
       query = query.filter(SlidePage.content.ilike(f"%{keyword}%"))
   return query.order_by(SlidePage.page_number).limit(top_k).all()


def find_slides_for_question(db: Session, course_id: int, question: Question, top_k: int = 2) -> list[SlidePage]:
   """Tìm slide liên quan bằng embedding khi có sẵn, fallback sang tìm kiếm text khi không có."""
   if not course_id or not question or not question.content:
       return []

   api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("api_key_gemini")
   if not api_key:
       return _fallback_text_search(db, course_id, question.content.strip(), top_k=top_k)

   try:
       from google import genai
       from google.genai import types

       client = genai.Client(api_key=api_key)
       response = client.models.embed_content(
           model="models/gemini-embedding-2",
           contents=question.content.strip(),
           config=types.EmbedContentConfig(output_dimensionality=768),
       )
       if response and getattr(response, "embeddings", None):
           vector = response.embeddings[0].values
           if vector:
               base_query = db.query(SlidePage).filter(
                   SlidePage.course_id == course_id,
                   SlidePage.embedding.isnot(None),
               )
               return (
                   base_query.order_by(SlidePage.embedding.cosine_distance(vector))
                   .limit(top_k)
                   .all()
               )
   except Exception:
       pass

   return _fallback_text_search(db, course_id, question.content.strip(), top_k=top_k)


def solve_question_groq(question_text: str, slides: list[SlidePage]) -> str:
   """Gọi Groq để giải câu hỏi dựa trên nội dung slide. Nếu thiếu API key, trả về nội dung slide đã có."""
   groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("grod_api_key") or os.getenv("GROQ_APIKEY")
   context_text = "\n---\n".join(
       f"[Slide Trang {s.page_number}]: {s.content[:500]}"
       for s in slides
       if getattr(s, "content", "").strip()
   )

   if not groq_api_key:
       if not context_text:
           return "Cần cấu hình GROQ_API_KEY để giải câu hỏi và không có slide căn cứ nào phù hợp."
       return "Không thể gọi Groq vì thiếu API key. Dưới đây là phần nội dung slide liên quan để bạn tham khảo:\n\n" + context_text[:2000]

   client = Groq(api_key=groq_api_key)
   system_prompt = "Bạn là trợ lý giải đề thi đại học PTIT. Trả lời cực kỳ ngắn gọn, chuẩn barem, không văn vở chào hỏi."
   user_prompt = f"""
NGỮ CẢNH TỪ SLIDE:
{context_text}

CÂU HỎI THI:
{question_text}

YÊU CẦU BẮT BUỘC:
- Nếu là trắc nghiệm: In đậm ngay **ĐÁP ÁN: [A/B/C/D]** ở dòng đầu, giải thích tối đa 2 câu ngắn gọn và ghi rõ Căn cứ: Slide trang [X].
- Nếu là tự luận: Đi thẳng vào Bước 1, Bước 2 (dùng công thức LaTeX $...$), Kết luận đáp số và ghi rõ Căn cứ: Slide trang [X].
"""

   completion = client.chat.completions.create(
       model="qwen/qwen3.8-27b",
       messages=[
           {"role": "system", "content": system_prompt},
           {"role": "user", "content": user_prompt},
       ],
       temperature=0.1,
       max_completion_tokens=600,
       top_p=0.95,
       reasoning_effort="default",
       stream=False,
       stop=None,
   )
   answer = completion.choices[0].message.content or ""
   return answer.strip()

