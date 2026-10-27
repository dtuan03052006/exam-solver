import json
import os
import shutil
from collections import Counter
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.models.course import Course
from app.models.slide import SlidePage
from app.services.ingest_slide_pdf import ingest_slide_pdf

router = APIRouter(prefix="/slides", tags=["Slides"])

STATUS_MAPPING = {
    "uploading": "Đang tải",
    "processing": "Đang phân tích",
    "completed": "Hoàn tất",
    "failed": "Thất bại",
}

class UpdateDocumentPayload(BaseModel):
    name: Optional[str] = None
    folder_name: Optional[str] = None
    tags: Optional[list[str]] = None
    description: Optional[str] = None

def parse_tags(tags_input: Optional[str]) -> list[str]:
    if not tags_input:
        return []
    tags_input = tags_input.strip()
    if tags_input.startswith("[") and tags_input.endswith("]"):
        try:
            parsed = json.loads(tags_input)
            if isinstance(parsed, list):
                return [str(t).strip() for t in parsed if str(t).strip()]
        except Exception:
            pass
    return [t.strip() for t in tags_input.split(",") if t.strip()]

def process_slide_background(course_id: int, file_bytes: bytes, filename: str):
    if SessionLocal is None:
        return
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return
        course.status = "processing"
        course.error_message = None
        db.commit()

        ingest_slide_pdf(
            db=db,
            course_id=course_id,
            file_bytes=file_bytes,
            filename=filename,
        )

        course.status = "completed"
        db.commit()
    except Exception as exc:
        db.rollback()
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            course.status = "failed"
            course.error_message = str(exc)[:500]
            db.commit()
    finally:
        db.close()

@router.post("/upload")
async def upload_slides(
    background_tasks: BackgroundTasks,
    course_name: str = Form(...),
    folder_name: str = Form("Mặc định"),
    tags: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    background: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ hỗ trợ file PDF, DOCX, TXT, MD",
        )

    file_bytes = await file.read()
    clean_name = course_name.strip()
    parsed_tags = parse_tags(tags)

    course = db.query(Course).filter(func.lower(Course.name) == clean_name.lower()).first()
    if not course:
        course = Course(
            name=clean_name,
            folder_name=folder_name.strip() or "Mặc định",
            tags=parsed_tags,
            description=description.strip() if description else None,
            status="uploading",
            file_type=ext.replace(".", ""),
        )
        db.add(course)
    else:
        if folder_name:
            course.folder_name = folder_name.strip()
        if parsed_tags:
            course.tags = list(set((course.tags or []) + parsed_tags))
        if description:
            course.description = description.strip()
        course.status = "uploading"
        course.error_message = None
        course.file_type = ext.replace(".", "")

    db.commit()
    db.refresh(course)

    if background:
        course.status = "processing"
        db.commit()
        background_tasks.add_task(process_slide_background, course.id, file_bytes, file.filename)
        return {
            "message": f"Đã tải lên '{file.filename}'. Đang phân tích tài liệu ở chế độ nền.",
            "course_id": course.id,
            "course_name": course.name,
            "status": course.status,
            "status_label": STATUS_MAPPING.get(course.status, course.status),
            "folder_name": course.folder_name,
            "tags": course.tags,
        }

    try:
        course.status = "processing"
        db.commit()
        total_pages = ingest_slide_pdf(
            db=db,
            course_id=course.id,
            file_bytes=file_bytes,
            filename=file.filename,
        )
        course.status = "completed"
        db.commit()
        return {
            "message": f"Đã nạp thành công tài liệu '{file.filename}' vào '{course.name}'!",
            "course_id": course.id,
            "course_name": course.name,
            "status": "completed",
            "status_label": STATUS_MAPPING["completed"],
            "filename": file.filename,
            "total_pages_processed": total_pages,
            "folder_name": course.folder_name,
            "tags": course.tags,
        }
    except Exception as exc:
        course.status = "failed"
        course.error_message = str(exc)[:500]
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xử lý slide: {str(exc)}",
        )

@router.get("")
def list_documents(
    q: Optional[str] = Query(None),
    folder_name: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Course)

    if q:
        clean_q = q.strip()
        query = query.filter(
            or_(
                Course.name.ilike(f"%{clean_q}%"),
                Course.description.ilike(f"%{clean_q}%"),
                Course.tags.cast(String).ilike(f"%{clean_q}%"),
            )
        )

    if folder_name:
        query = query.filter(Course.folder_name == folder_name.strip())

    if tag:
        query = query.filter(Course.tags.cast(String).ilike(f"%{tag.strip()}%"))

    if status_filter:
        query = query.filter(Course.status == status_filter.strip())

    total = query.count()

    sort_col = getattr(Course, sort_by, Course.created_at)
    order_func = sort_col.desc() if sort_order.lower() == "desc" else sort_col.asc()
    courses = query.order_by(order_func).offset((page - 1) * page_size).limit(page_size).all()

    course_ids = [c.id for c in courses]
    page_counts = {}
    if course_ids:
        counts = (
            db.query(SlidePage.course_id, func.count(SlidePage.id))
            .filter(SlidePage.course_id.in_(course_ids))
            .group_by(SlidePage.course_id)
            .all()
        )
        page_counts = dict(counts)

    items = [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "folder_name": c.folder_name,
            "tags": c.tags or [],
            "status": c.status,
            "status_label": STATUS_MAPPING.get(c.status, c.status),
            "file_type": c.file_type,
            "error_message": c.error_message,
            "total_pages": page_counts.get(c.id, 0),
            "created_at": c.created_at,
        }
        for c in courses
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }

@router.get("/folders")
def list_folders(db: Session = Depends(get_db)):
    results = (
        db.query(Course.folder_name, func.count(Course.id))
        .group_by(Course.folder_name)
        .order_by(Course.folder_name)
        .all()
    )
    return [{"folder_name": name, "document_count": count} for name, count in results]

@router.get("/tags")
def list_tags(db: Session = Depends(get_db)):
    courses = db.query(Course.tags).filter(Course.tags.isnot(None)).all()
    tag_counter = Counter()
    for (tags,) in courses:
        if isinstance(tags, list):
            for t in tags:
                clean_t = str(t).strip()
                if clean_t:
                    tag_counter[clean_t] += 1
    return [{"tag": tag, "document_count": count} for tag, count in tag_counter.most_common()]

@router.get("/{course_id}/status")
def get_document_status(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu",
        )

    total_pages = db.query(SlidePage).filter(SlidePage.course_id == course_id).count()

    return {
        "course_id": course.id,
        "name": course.name,
        "status": course.status,
        "status_label": STATUS_MAPPING.get(course.status, course.status),
        "error_message": course.error_message,
        "file_type": course.file_type,
        "total_pages": total_pages,
        "created_at": course.created_at,
    }

@router.get("/{course_id}")
def get_document_detail(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu",
        )

    slides = (
        db.query(SlidePage.id, SlidePage.page_number, SlidePage.chapter, SlidePage.image_url)
        .filter(SlidePage.course_id == course_id)
        .order_by(SlidePage.page_number)
        .all()
    )

    return {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "folder_name": course.folder_name,
        "tags": course.tags or [],
        "status": course.status,
        "status_label": STATUS_MAPPING.get(course.status, course.status),
        "file_type": course.file_type,
        "error_message": course.error_message,
        "created_at": course.created_at,
        "total_pages": len(slides),
        "slides": [
            {
                "id": s.id,
                "page_number": s.page_number,
                "chapter": s.chapter,
                "image_url": s.image_url,
            }
            for s in slides
        ],
    }

@router.patch("/{course_id}")
def update_document(
    course_id: int,
    payload: UpdateDocumentPayload,
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu",
        )

    if payload.name is not None and payload.name.strip():
        course.name = payload.name.strip()
    if payload.folder_name is not None:
        course.folder_name = payload.folder_name.strip() or "Mặc định"
    if payload.tags is not None:
        course.tags = [str(t).strip() for t in payload.tags if str(t).strip()]
    if payload.description is not None:
        course.description = payload.description.strip()

    db.commit()
    db.refresh(course)

    return {
        "id": course.id,
        "name": course.name,
        "folder_name": course.folder_name,
        "tags": course.tags,
        "description": course.description,
        "status": course.status,
    }

@router.delete("/{course_id}")
def delete_document(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu",
        )

    course_folder = os.path.join("uploads", "slides", f"course_{course_id}")
    if os.path.exists(course_folder):
        shutil.rmtree(course_folder, ignore_errors=True)

    course_name = course.name
    db.delete(course)
    db.commit()

    return {
        "message": f"Đã xóa tài liệu '{course_name}' thành công!",
        "deleted_id": course_id,
    }
