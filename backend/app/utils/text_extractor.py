import base64
import io
import logging
import os
import re
import subprocess
import tempfile

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


async def convert_to_html(filename: str, data: bytes) -> tuple[str, str]:
    """Convert a PDF or DOCX file to (html, plain_text)."""
    import asyncio
    return await asyncio.to_thread(_convert_to_html_sync, filename, data)


def _convert_to_html_sync(filename: str, data: bytes) -> tuple[str, str]:
    if filename.lower().endswith(".pdf"):
        return _pdf_to_html_and_text(data)
    return _docx_to_html_and_text(data)


def _pdf_to_html_and_text(data: bytes) -> tuple[str, str]:
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    plain_text = "\n\n".join(pages).strip()

    html = _pdf2htmlex(data)
    if html is None:
        html = _plain_text_to_html(plain_text)

    return html, plain_text


def _pdf2htmlex(data: bytes) -> str | None:
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input.pdf")
            output_path = os.path.join(tmpdir, "input.html")

            with open(input_path, "wb") as f:
                f.write(data)

            result = subprocess.run(
                [
                    "pdf2htmlEX",
                    "--embed", "cfijo",
                    "--zoom", "1.3",
                    "--dest-dir", tmpdir,
                    input_path,
                ],
                capture_output=True,
                timeout=120,
            )

            if result.returncode != 0:
                logger.warning("pdf2htmlEX failed: %s", result.stderr.decode())
                return None

            with open(output_path, "r", encoding="utf-8") as f:
                html = f.read()

            return _inline_external_resources(html, tmpdir)

    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        logger.warning("pdf2htmlEX unavailable: %s", e)
        return None


def _inline_external_resources(html: str, tmpdir: str) -> str:
    def _is_external(src: str) -> bool:
        return src.startswith(("http://", "https://", "data:"))

    def inline_css_urls(css: str) -> str:
        _FONT_MIME = {"woff": "font/woff", "woff2": "font/woff2",
                      "ttf": "font/ttf", "eot": "application/vnd.ms-fontobject",
                      "otf": "font/otf", "png": "image/png",
                      "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml"}

        def replace_url(m: re.Match) -> str:
            url = m.group(1).strip("\"'")
            if _is_external(url):
                return m.group(0)
            path = os.path.join(tmpdir, url)
            if not os.path.exists(path):
                return m.group(0)
            ext = os.path.splitext(url)[1].lstrip(".").lower()
            mime = _FONT_MIME.get(ext, f"application/{ext}")
            with open(path, "rb") as f:
                data = base64.b64encode(f.read()).decode()
            return f"url(data:{mime};base64,{data})"

        return re.sub(r'url\(([^)]+)\)', replace_url, css)

    def replace_link(match: re.Match) -> str:
        href_m = re.search(r'href=["\']([^"\']+)["\']', match.group(0))
        if not href_m or _is_external(href_m.group(1)):
            return match.group(0)
        path = os.path.join(tmpdir, href_m.group(1))
        if not os.path.exists(path):
            return match.group(0)
        with open(path, encoding="utf-8") as f:
            return f"<style>{inline_css_urls(f.read())}</style>"

    def replace_script(match: re.Match) -> str:
        src = match.group(1)
        if _is_external(src):
            return match.group(0)
        path = os.path.join(tmpdir, src)
        if not os.path.exists(path):
            return match.group(0)
        with open(path, encoding="utf-8") as f:
            return f"<script>{f.read()}</script>"

    def replace_img(match: re.Match) -> str:
        src_m = re.search(r'src=["\']([^"\']+)["\']', match.group(0))
        if not src_m or _is_external(src_m.group(1)):
            return match.group(0)
        path = os.path.join(tmpdir, src_m.group(1))
        if not os.path.exists(path):
            return match.group(0)
        ext = os.path.splitext(src_m.group(1))[1].lstrip(".").lower() or "png"
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        return match.group(0).replace(
            src_m.group(0), f'src="data:image/{ext};base64,{data}"'
        )

    html = re.sub(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*/?>',
                  replace_link, html, flags=re.IGNORECASE)
    html = re.sub(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*></script>',
                  replace_script, html, flags=re.IGNORECASE)
    html = re.sub(r'<img\b[^>]*src=["\'][^"\']*["\'][^>]*/?>',
                  replace_img, html, flags=re.IGNORECASE)

    html = html.replace('</head>', '<style>.t{visibility:visible!important}</style></head>', 1)
    return html


def _docx_to_html_and_text(data: bytes) -> tuple[str, str]:
    import mammoth

    from app.utils.storage import upload_image_sync

    def handle_image(image) -> dict[str, str]:
        with image.open() as f:
            image_data = f.read()
        content_type = image.content_type or "image/png"
        url = upload_image_sync(image_data, content_type)
        return {"src": url} if url else {"src": ""}

    result = mammoth.convert_to_html(
        io.BytesIO(data),
        convert_image=mammoth.images.img_element(handle_image),
    )
    html = result.value
    plain_text = strip_to_plain_text(html)
    return html, plain_text


def _plain_text_to_html(text: str) -> str:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return "\n".join(f"<p>{p.replace(chr(10), ' ')}</p>" for p in paragraphs)


def strip_to_plain_text(html: str) -> str:
    """Strip HTML tags and return plain text for Claude, embeddings, and tsvector."""
    return BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True)
