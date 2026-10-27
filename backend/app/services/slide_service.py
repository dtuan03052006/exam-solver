import io
import os
import time
from dotenv import load_dotenv
import pymupdf
from PIL import Image

try:
    import docx
except ImportError:  # pragma: no cover - optional dependency for DOCX processing
    docx = None

load_dotenv()

def process_pdf_pages(file_bytes: bytes) -> list[dict]:
    """
    Duyệt từng trang PDF, trả về danh sách gồm:
    - page_number: số trang (bắt đầu từ 1)
    - text: nội dung chữ
    - image_bytes: dữ liệu ảnh trang slide (định dạng WebP)
    """
    if not file_bytes:
        return []

    results = []
    # Dùng context manager để tự động giải phóng tài nguyên PDF
    with pymupdf.open(stream=file_bytes, filetype="pdf") as doc:
        for page_index, page in enumerate(doc):
            # 1. Trích xuất text
            text = page.get_text().strip()

            # 2. Render trang thành Pixmap
            pix = page.get_pixmap(dpi=150)

            # 3. Chuyển raw bytes sang PIL Image trực tiếp
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

            # 4. Nén sang WebP
            buffer = io.BytesIO()
            img.save(buffer, format="WEBP", quality=80)
            webp_bytes = buffer.getvalue()
            buffer.close()

            results.append({
                "page_number": page_index + 1,
                "text": text,
                "image_bytes": webp_bytes,
            })

    return results

def process_txt_content(file_bytes: bytes, chunk_size: int = 1000) -> list[dict]:

    try:
        raw_text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raw_text = file_bytes.decode("latin-1", errors="ignore")

    paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
    results = []
    current_chunk = []
    current_len = 0
    page_num = 1

    for p in paragraphs:
        current_chunk.append(p)
        current_len += len(p)
        if current_len >= chunk_size:
            results.append({
                "page_number": page_num,
                "text": "\n\n".join(current_chunk),
                "image_bytes": None  # File text không có ảnh
            })
            page_num += 1
            current_chunk = []
            current_len = 0

    if current_chunk:
        results.append({
            "page_number": page_num,
            "text": "\n\n".join(current_chunk),
            "image_bytes": None
        })

    return results

def process_docx_content(file_bytes: bytes, chunk_size: int = 1000) -> list[dict]:
    """
    1. Dùng docx.Document đọc bytes từ bộ nhớ (BytesIO)
    2. Trích xuất toàn bộ các đoạn văn bản (paragraphs)
    3. Gom thành từng trang tương tự như file text
    """
    if docx is None:
        raise ImportError("python-docx is required to process DOCX files.")

    doc = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    results = []
    current_chunk = []
    current_len = 0
    page_num = 1

    for p in paragraphs:
        current_chunk.append(p)
        current_len += len(p)
        if current_len >= chunk_size:
            results.append({
                "page_number": page_num,
                "text": "\n\n".join(current_chunk),
                "image_bytes": None
            })
            page_num += 1
            current_chunk = []
            current_len = 0

    if current_chunk:
        results.append({
            "page_number": page_num,
            "text": "\n\n".join(current_chunk),
            "image_bytes": None
        })

    return results
import os

def process_any_document(file_bytes: bytes, filename: str) -> list[dict]:
    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    
    if ext == "pdf":
        return process_pdf_pages(file_bytes)       # Hàm cắt PDF cũ của bạn
    elif ext in ["docx", "doc"]:
        return process_docx_content(file_bytes)     # Hàm đọc Word vừa viết
    elif ext in ["txt", "md"]:
        return process_txt_content(file_bytes)      # Hàm đọc Text vừa viết
    else:
        raise ValueError(f"Định dạng '.{ext}' chưa được hỗ trợ!")
def get_embeddings_batch(texts: list[str], batch_size: int = 50) -> list[list[float] | None]:
    """
    Gửi danh sách tất cả các trang slide lên Gemini để lấy vector embedding.
    Có cơ chế bảo vệ: nếu không có key AIzaSy hợp lệ hoặc lỗi mạng, trả về None an toàn (không làm sập server).
    """
    if not texts:
        return []

    api_key = (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("api_key_gemini")
    )

    if not api_key:
        return [None] * len(texts)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            clean_batch = [t if (t and t.strip()) else "Slide hình ảnh bài giảng" for t in batch]
            response = client.models.embed_content(
                model="gemini-embedding-001",
                contents=clean_batch,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            all_embeddings.extend([item.values for item in response.embeddings])
            if (i + batch_size) < len(texts):
                time.sleep(0.3)
        return all_embeddings
    except Exception as exc:
        print(f"[WARN] Lỗi khi tạo embedding từ Google: {exc}")
        return [None] * len(texts)