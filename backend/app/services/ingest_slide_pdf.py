import os
from sqlalchemy.orm import Session
from app.models.slide import SlidePage
from app.services.slide_service import process_any_document, get_embeddings_batch
from app.services.save_image_locally import save_slide_image
from dotenv import load_dotenv

load_dotenv()


def ingest_slide_pdf(db: Session, course_id: int, file_bytes: bytes, filename: str = "document.pdf") -> int:
    pages_data = process_any_document(file_bytes, filename)
    if not pages_data:
        return 0

    texts_to_embed = [
        p["text"].strip() if isinstance(p.get("text"), str) and p["text"].strip() else "Slide hình ảnh"
        for p in pages_data
    ]
    vectors = get_embeddings_batch(texts_to_embed)

    for i, page in enumerate(pages_data):
        page_num = page["page_number"]
        raw_text = page.get("text") or ""
        img_bytes = page.get("image_bytes")

        image_url = None
        if img_bytes:
            image_url = save_slide_image(course_id, filename, page_num, img_bytes)

        embedding_vector = vectors[i] if i < len(vectors) else None

        slide_record = SlidePage(
            course_id=course_id,
            chapter=os.path.splitext(filename)[0],
            page_number=page_num,
            content=raw_text,
            image_url=image_url,
            embedding=embedding_vector,
        )
        db.add(slide_record)

    db.commit()
    return len(pages_data)