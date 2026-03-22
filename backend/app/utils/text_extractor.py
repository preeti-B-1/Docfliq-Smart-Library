import io
import logging

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def convert_to_html(filename: str, data: bytes) -> tuple[str, str]:
    """Convert a PDF or DOCX file to (html, plain_text)."""
    if filename.lower().endswith(".pdf"):
        return _pdf_to_html_and_text(data)
    return _docx_to_html_and_text(data)


def _pdf_to_html_and_text(data: bytes) -> tuple[str, str]:
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()

    plain_text = "\n\n".join(pages).strip()
    html = _text_to_html(plain_text)
    return html, plain_text


def _docx_to_html_and_text(data: bytes) -> tuple[str, str]:
    import mammoth

    result = mammoth.convert_to_html(io.BytesIO(data))
    html = result.value
    plain_text = strip_to_plain_text(html)
    return html, plain_text


def _text_to_html(text: str) -> str:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return "\n".join(f"<p>{p.replace(chr(10), ' ')}</p>" for p in paragraphs)


def strip_to_plain_text(html: str) -> str:
    """Strip HTML tags and return plain text for Claude, embeddings, and TSVECTOR."""
    return BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True)
