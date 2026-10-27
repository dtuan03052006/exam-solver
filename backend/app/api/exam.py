from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException,status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session,joinedload
from app.db.session import get_db
from app.models.course import Course
from app.models.exam import ExamPaper, Question, Solution
from app.models.slide import SlidePage
from app.services.exam_service import parse_exam_questions_with_groq_vision
from app.services.solver_service import (
    find_slides_for_question,
    solve_question_groq,
)
from dotenv import load_dotenv

from app.models import course
load_dotenv()
router = APIRouter(prefix="/exams", tags=["Exams"], )

class QuestionUser(BaseModel):
    course : str 
    question_text : str

@router.post("/upload")
async def upload_exam(
    course_name: str = Form(..., description="Tên môn học"),
    title: str = Form(..., description="Tên đề thi, ví dụ: 'Đề thi cuối kỳ 2024'"),
    year: int = Form(None),
    semester: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    file_type = file.content_type or "image/jpeg"

    # 1. Tìm hoặc tự động tạo môn học theo tên
    clean_name = course_name.strip()
    course = db.query(Course).filter(func.lower(Course.name) == clean_name.lower()).first()
    if not course:
        course = Course(name=clean_name)
        db.add(course)
        db.commit()
        db.refresh(course)

    # 2. Tạo bản ghi đề thi thuộc môn học đó
    exam_paper = ExamPaper(
        course_id=course.id,
        title=title,
        year=year,
        semester=semester,
    )
    db.add(exam_paper)
    db.commit()
    db.refresh(exam_paper)

    question_data = parse_exam_questions_with_groq_vision(file_bytes, file_type)

    created_questions = []
    for q in question_data:
        new_q = Question(
            exam_id=exam_paper.id,
            question_number=q.get("question_number", "Câu hỏi"),
            content=q.get("content", ""),
            question_type=q.get("question_type", "essay"),
        )
        db.add(new_q)
        created_questions.append(new_q)
    db.commit()

    return {
        "message": f"Đã nạp đề thi vào môn '{course.name}' thành công!",
        "course_name": course.name,
        "exam_id": exam_paper.id,
        "total_questions": len(created_questions),
    }


@router.post("/questions/{question_id}/solve")
def solve_single_question_endpoint(question_id: int, db: Session = Depends(get_db)):
    """
    Giải 1 câu hỏi cụ thể:
    1. Tìm câu hỏi và lấy course_id tương ứng
    2. Tìm 2 slide căn cứ phù hợp
    3. Gọi LLM giải câu hỏi
    4. Lưu hoặc cập nhật Solution vào DB
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")

    # Lấy course_id thông qua quan hệ với exam
    exam = db.query(ExamPaper).filter(ExamPaper.id == question.exam_id).first()
    course_id = exam.course_id if exam else None

    # Tìm slide liên quan
    slides = find_slides_for_question(db, course_id=course_id, question=question, top_k=2)
    slide_ids = [s.id for s in slides]

    # Gọi hàm giải cho 1 câu
    answer_text = solve_question_groq(question_text=question.content.strip(), slides=slides)

    # Cập nhật hoặc thêm mới Solution
    solution = db.query(Solution).filter(Solution.question_id == question.id).first()
    if not solution:
        solution = Solution(
            question_id=question.id,
            content=answer_text,
            related_slide_ids=slide_ids,
        )
        db.add(solution)
    else:
        solution.content = answer_text #type: ignore
        solution.related_slide_ids = slide_ids #type: ignore

    db.commit()

    return {
        "message": "Đã giải câu hỏi thành công!",
        "question_id": question.id,
        "solution": answer_text,
        "related_slides": [
            {
                "id": s.id,
                "chapter": getattr(s, "chapter", None),
                "page_number": s.page_number,
                "image_url": getattr(s, "image_url", None),
            }
            for s in slides
        ],
    }

@router.post("/ask-free")
def ask_free_question(payload : QuestionUser, db: Session = Depends(get_db)):
    course_name = payload.course.strip()
    question = payload.question_text.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Câu hỏi không được để trống")
    course = db.query(Course).filter(func.lower(Course.name) == course_name.lower()).first()
    course_id = course.id if course else None
    tmp_question = Question(content=question)
    slides = []
    if course_id:
        slides = find_slides_for_question(db, course_id=course_id, question=tmp_question, top_k=2)
    solution_text = solve_question_groq(question_text=question, slides=slides)
    return {
        "course_name": course_name,
        "question": question,
        "solution": solution_text,
        "related_slides": [
            {
                "id": s.id,
                "chapter": getattr(s, "chapter", None),
                "page_number": s.page_number,
                "image_url": getattr(s, "image_url", None),
            }
            for s in slides
        ],
    }


@router.get("/{exam_id}/details")
def get_exam_details(exam_id: int, db: Session = Depends(get_db)):

    exam = (
        db.query(ExamPaper)
        .options(joinedload(ExamPaper.questions).joinedload(Question.solution))
        .filter(ExamPaper.id == exam_id)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đề thi")

    # Thu thập tất cả related_slide_ids để query 1 lần duy nhất thay vì query trong loop
    all_slide_ids = set()
    for q in exam.questions:
        if q.solution and q.solution.related_slide_ids:
            all_slide_ids.update(q.solution.related_slide_ids)

    slide_map = {}
    if all_slide_ids:
        slides = db.query(SlidePage).filter(SlidePage.id.in_(all_slide_ids)).all()
        slide_map = {
            s.id: {
                "chapter": getattr(s, "chapter", None),
                "page_number": s.page_number,
                "image_url": getattr(s, "image_url", None),
            }
            for s in slides
        }

    output_questions = []
    for q in exam.questions:
        sol_data = q.solution.content if q.solution else None
        related_slides = []
        if q.solution and q.solution.related_slide_ids:
            related_slides = [
                slide_map[sid] for sid in q.solution.related_slide_ids if sid in slide_map
            ]

        output_questions.append({
            "question_id": q.id,
            "question_number": q.question_number,
            "content": q.content,
            "question_type": q.question_type,
            "solution": sol_data,
            "related_slides": related_slides,
        })

    return {
        "id": exam.id,
        "course_id": exam.course_id,
        "title": exam.title,
        "year": exam.year,
        "semester": exam.semester,
        "questions": output_questions,
    }



