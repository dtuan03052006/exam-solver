import os

def save_slide_image(course_id: int, page_number: int, image_bytes: bytes) -> str:
    """
    Lưu file ảnh WebP vào ổ cứng cục bộ và trả về đường dẫn URL
    Ví dụ: /static/slides/course_1/page_3.webp
    """
    folder_path = f"uploads/slides/course_{course_id}"
    os.makedirs(folder_path, exist_ok=True)
    
    file_path = f"{folder_path}/page_{page_number}.webp"
    # TODO: Ghi image_bytes vào file_path bằng chế độ 'wb'
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    
    # Trả về đường dẫn để lưu vào database (ví dụ: f"/static/slides/course_{course_id}/page_{page_number}.webp")
    return f"/static/slides/course_{course_id}/page_{page_number}.webp"