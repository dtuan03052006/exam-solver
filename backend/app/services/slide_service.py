from pydoc import text
from google import genai
import fitz  # Tên gọi khi import của PyMuPDF
import io
import os
from PIL import Image



def process_pdf_pages(file_bytes: bytes):
    """
    Duyệt từng trang PDF, trả về danh sách gồm:
    - page_number: số trang (bắt đầu từ 1)
    - text: nội dung chữ
    - image_bytes: dữ liệu ảnh trang slide (định dạng WebP)
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    results = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        
        # 1. Trích xuất text
        # Gợi ý: Dùng page.get_text()
        text = page.get_text()

        # 2. Render trang thành ảnh (PixMap)
        # Gợi ý: Dùng page.get_pixmap(dpi=150) để ảnh nét vừa đủ
        image = page.get_pixmap(dpi=150)
        
        # 3. Nén ảnh sang WebP bằng Pillow để giảm dung lượng xuống < 100KB
        # Gợi ý: Image.open(io.BytesIO(pix.tobytes())).save(..., format="WEBP")
        image_bytes = io.BytesIO()
        Image.open(io.BytesIO(image.tobytes())).save(image_bytes, format="WEBP", quality=80)
        image_bytes = image_bytes.getvalue()

        # TODO: Gom page_number, text, và image_bytes vào results
        results.append({
            "page_number": page_index + 1,
            "text": text,
            "image_bytes": image_bytes
        })

    return results

def get_embedding(text: str):
    """
    Gọi API Gemini để lấy embedding vector cho text
    """
    client = genai.Client(api_key=os.getenv("api_key_gemini"))
    response = client.models.embed_content(
        model="text-embedding-004",
        contents=text
    )
    return response.embeddings[0].values