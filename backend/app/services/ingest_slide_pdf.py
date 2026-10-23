from sqlalchemy.orm import Session

from app.models.slide import SlidePage
from app.services.slide_service import process_pdf_pages, get_embedding
from app.services.save_image_locally import save_slide_image

def ingest_slide_pdf(db: Session, course_id: int, file_bytes: bytes) -> int:
    """
    Xử lý trọn gói file PDF và lưu toàn bộ các trang vào Database.
    Trả về: Tổng số trang đã xử lý thành công.
    """
    # 1. Gọi hàm tách trang đã viết ở trên
    pages_data = process_pdf_pages(file_bytes)
    
    # 2. Duyệt qua từng trang
    for page in pages_data:
        page_num = page["page_number"]
        raw_text = page["text"]
        img_bytes = page["image_bytes"]
        
        # 3. Lưu ảnh và lấy đường dẫn
        image_url = save_slide_image(course_id, page_num, img_bytes)
        # 4. Thổi ngữ cảnh và tạo vector
        # Nếu trang slide có chữ thì gọi get_embedding(), nếu slide rỗng thì embedding = None
        embedding_vector = get_embedding(raw_text) if raw_text.strip() else None

        # 5. Khởi tạo đối tượng SlidePage
        slide_record = SlidePage(
            course_id=course_id,
            page_number=page_num,
            content=raw_text,
            image_url=image_url,
            embedding=embedding_vector
        )
        
        # 6. Thêm vào database session
        db.add(slide_record)

    # 7. Commit toàn bộ vào DB
    db.commit()
    
    return len(pages_data)