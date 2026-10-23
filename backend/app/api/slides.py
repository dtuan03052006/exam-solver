from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ingest_slide_pdf import ingest_slide_pdf

router = APIRouter(prefix="/courses/{course_id}/slides", tags=["Slides"])

@router.post("/upload")
async def upload_slides(
    course_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Kiểm tra định dạng: Chỉ chấp nhận PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp tải lên bắt buộc phải có định dạng .pdf"
        )
    
    # 2. Đọc nội dung file dạng bytes
    file_bytes = await file.read()
    
    # 3. Gọi hàm xử lý ingest_slide_pdf mà bạn vừa viết
    try:
        total_pages = ingest_slide_pdf(db=db, course_id=course_id, file_bytes=file_bytes)
        return {
            "message": "Xử lý slide thành công!",
            "course_id": course_id,
            "filename": file.filename,
            "total_pages_processed": total_pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý slide: {str(e)}")