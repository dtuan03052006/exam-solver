import os
import re
from dotenv import load_dotenv
load_dotenv()
def sanitize_name(name: str) -> str:
    """Loại bỏ đuôi .pdf và ký tự lạ, ví dụ: 'Chương 1_2.pdf' -> 'chuong_1_2'"""
    base_name = os.path.splitext(name)[0]
    clean = re.sub(r'[^\w\-_]', '_', base_name)
    return clean.strip('_') or "tailieu"

def save_slide_image(course_id: int, doc_name: str, page_number: int, image_bytes: bytes) -> str | None:
    """
    Lưu ảnh vào thư mục: uploads/slides/course_{id}/{ten_tai_lieu}/page_{so_trang}.webp
    """
    if not image_bytes:
        return None

    clean_doc = sanitize_name(doc_name)
    folder_path = f"uploads/slides/course_{course_id}/{clean_doc}"
    os.makedirs(folder_path, exist_ok=True)

    file_path = f"{folder_path}/page_{page_number}.webp"
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    # Trả về URL để hiển thị trên trình duyệt
    return f"/static/slides/course_{course_id}/{clean_doc}/page_{page_number}.webp"