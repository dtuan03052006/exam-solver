import base64
import json
import os
from groq import Groq
from dotenv import load_dotenv
import io
from PIL import Image
import httpx
load_dotenv()
def compress_image_bytes(image_bytes: bytes, max_dim: int = 1920, quality: int = 80) -> bytes:
    """Nén và giảm kích thước ảnh để tránh lỗi WriteTimeout khi gửi Base64."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Chuyển sang RGB nếu là RGBA hoặc định dạng khác
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Resize nếu kích thước vượt quá max_dim mà vẫn giữ tỷ lệ
            width, height = img.size
            if max(width, height) > max_dim:
                scale = max_dim / max(width, height)
                new_size = (int(width * scale), int(height * scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            return buffer.getvalue()
    except Exception as e:
        print(f"[WARN] Không thể nén ảnh ({e}), dùng ảnh gốc.")
        return image_bytes

    
def parse_exam_questions_with_groq_vision(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[dict]:
    """
    Sử dụng Groq Vision LPU với model mới nhất qwen/qwen3.8-27b để bóc tách ảnh đề thi (~1s)!
    """
    compressed_bytes = compress_image_bytes(image_bytes)
    base64_image = base64.b64encode(compressed_bytes).decode("utf-8")

    # 2. Cấu hình timeout riêng cho từng giai đoạn (connect, read, write)
    custom_timeout = httpx.Timeout(
        connect=10.0,
        read=60.0,
        write=30.0,  # Cho phép tối đa 30s để đẩy body lên
        pool=10.0
    )
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("grod_api_key")

    groq_client = Groq(api_key=api_key, timeout=30.0)

    prompt = r"""
Bạn là một trợ lý số hóa đề thi chuyên nghiệp với độ chính xác tuyệt đối. 
Hãy đọc kỹ toàn bộ hình ảnh đề thi và bóc tách đầy đủ tất cả nội dung của từng câu hỏi:

QUY TẮC BÓC TÁCH:
1. Giữ lại TOÀN BỘ thông tin: Không tóm tắt, không lược bỏ bất kỳ từ ngữ, chú thích, gợi ý hay dữ kiện nào trong đề thi.
2. Xử lý BẢNG BIỂU & SƠ ĐỒ:
   - Mọi bảng dữ liệu/bảng số liệu phải được chuyển đổi nguyên vẹn sang định dạng bảng Markdown (dùng |, -) và chèn trực tiếp vào vị trí tương ứng trong trường 'content'.
   - Nếu có hình vẽ, đồ thị hoặc sơ đồ mạch điện/hình học: hãy thêm một dòng mô tả chi tiết nội dung sơ đồ đó dưới dạng [Hình vẽ: ...] hoặc [Sơ đồ: ...].
3. Công thức khoa học:
   - Toàn bộ công thức toán học, vật lý, hóa học, ký hiệu khoa học phải chuyển sang LaTeX đặt trong $...$ (nội dòng) hoặc $$...$$ (khối độc lập).
   - ĐẶC BIỆT LƯU Ý: Escape chính xác dấu gạch chéo ngược trong chuỗi JSON (ví dụ: viết \\frac, \\sum, \\alpha thay vì \frac, \sum, \alpha).
4. Phân loại câu hỏi:
   - Trắc nghiệm: Gộp đầy đủ các đáp án A, B, C, D (giữ cả nội dung text và công thức) vào trường 'content', phân cách rõ ràng bằng ký tự xuống dòng (\n). Ghi 'question_type': 'multiple_choice'.
   - Tự luận/Điền khuyết: Ghi 'question_type': 'essay'.
   - Câu hỏi có ý phụ (1a, 1b, a, b...): Nếu ý đi liền mạch với bài toán thì gộp chung, nếu là câu hỏi độc lập thì tách riêng theo mã 'question_number'.

BẮT BUỘC TRẢ VỀ JSON THUẦN TÚY (không bọc trong ```json hay thêm lời giải thích):
{
  "questions": [
    {
      "question_number": "Câu 1",
      "content": "Nội dung đầy đủ bao gồm văn bản, công thức $\\alpha$, bảng biểu dạng Markdown:\n| Cột 1 | Cột 2 |\n|---|---|\n| A | B |",
      "question_type": "essay"
    }
  ]
}
"""

    chat_completion = groq_client.chat.completions.create(
        model="qwen/qwen3.8-27b", 
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )

    result_text = chat_completion.choices[0].message.content or "{}"
    parsed = json.loads(result_text, strict=False)
    return parsed.get("questions", [])


