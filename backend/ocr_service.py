import re
import os
import importlib.util
from typing import Optional, Tuple, Any, cast

HAS_PADDLE = importlib.util.find_spec("paddleocr") is not None
HAS_EASYOCR = importlib.util.find_spec("easyocr") is not None
HAS_PYPDF = (
    importlib.util.find_spec("pypdf") is not None
    or importlib.util.find_spec("PyPDF2") is not None
)

HAS_OCR = HAS_PADDLE or HAS_EASYOCR

HAS_PDF2IMAGE = importlib.util.find_spec("pdf2image") is not None

_ocr_reader: Optional[Any] = None
_ocr_init_error: Optional[str] = None


def ocr_status() -> dict:
    if HAS_PADDLE:
        engine = "paddleocr"
    elif HAS_EASYOCR:
        engine = "easyocr"
    else:
        engine = None
    return {
        "available": HAS_OCR,
        "engine": engine,
        "text_files": True,
        "pdf_text": HAS_PYPDF,
        "init_error": _ocr_init_error,
    }


def _get_ocr_reader():
    """Lazy-load OCR engine (first image upload may take a few seconds)."""
    global _ocr_reader, _ocr_init_error
    if _ocr_reader is not None:
        return _ocr_reader
    if _ocr_init_error:
        return None
    try:
        if HAS_PADDLE:
            paddleocr = importlib.import_module("paddleocr")
            PaddleOCR = getattr(paddleocr, "PaddleOCR")
            _ocr_reader = PaddleOCR(use_angle_cls=True, lang="en")
        elif HAS_EASYOCR:
            easyocr = importlib.import_module("easyocr")
            Reader = getattr(easyocr, "Reader")
            _ocr_reader = Reader(["en"], gpu=False)
        return _ocr_reader
    except Exception as e:
        _ocr_init_error = str(e)
        return None


def _read_pdf_text(file_path: str) -> str:
    if not HAS_PYPDF:
        return ""
    try:
        try:
            pypdf = importlib.import_module("pypdf")
            PdfReader = getattr(pypdf, "PdfReader")
        except Exception:
            pyPdf2 = importlib.import_module("PyPDF2")
            PdfReader = getattr(pyPdf2, "PdfReader")
        reader = PdfReader(file_path)
        parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        return "\n".join(parts)
    except Exception:
        return ""


def _run_ocr_on_pdf(file_path: str) -> Tuple[str, Optional[str]]:
    if not HAS_PDF2IMAGE:
        return "", (
            "PDF has no extractable text and pdf2image is not installed. "
            "Install pdf2image and a PDF rendering backend (poppler)."
        )
    try:
        pdf2image = importlib.import_module("pdf2image")
        convert_from_path = getattr(pdf2image, "convert_from_path")
        import tempfile
    except Exception as e:
        return "", f"PDF conversion failed: {e}"

    texts = []
    temp_files = []
    try:
        images = convert_from_path(file_path)
        for img in images:
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            temp_files.append(tmp.name)
            img.save(tmp.name, format="PNG")
            tmp.close()
            page_text, note = _run_ocr_on_image(tmp.name)
            if note:
                # If OCR failed for a page, return the note.
                return "", note
            if page_text:
                texts.append(page_text)
        return "\n".join(texts), None
    finally:
        for p in temp_files:
            try:
                os.unlink(p)
            except Exception:
                pass


def _run_ocr_on_image(file_path: str) -> Tuple[str, Optional[str]]:
    reader = _get_ocr_reader()
    if reader is None:
        hint = _ocr_init_error or "OCR engine could not start."
        return "", (
            f"{hint} Try: pip install easyocr pypdf pillow opencv-python-headless"
        )

    extracted_text = []
    try:
        if HAS_PADDLE:
            result = reader.ocr(file_path, cls=True)
            # PaddleOCR returns a list (one entry per page). Each page entry
            # is itself a list of lines where text is usually at index 1
            if result:
                for page in result:
                    if not page:
                        continue
                    for line in page:
                        # line may be like [box, (text, score)] or [box, text]
                        try:
                            item = cast(Any, line)[1]
                            if isinstance(item, (list, tuple)):
                                extracted_text.append(item[0])
                            else:
                                extracted_text.append(item)
                        except Exception:
                            # fallback to stringifying the line
                            extracted_text.append(str(line))
        elif HAS_EASYOCR:
            result = reader.readtext(file_path)
            for line in result:
                # easyocr returns (bbox, text, confidence)
                try:
                    item = cast(Any, line)[1]
                    extracted_text.append(item)
                except Exception:
                    extracted_text.append(str(line))
    except Exception as e:
        return "", f"OCR processing failed: {e}"

    return " ".join(extracted_text), None


def extract_text(file_path: str) -> Tuple[str, Optional[str]]:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in (".txt", ".text"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(), None

    if ext == ".pdf":
        text = _read_pdf_text(file_path)
        if text.strip():
            return text, None
        if not HAS_OCR:
            return "", (
                "PDF has no extractable text. Install OCR: "
                "pip install easyocr pypdf pillow opencv-python-headless"
            )
        # If pypdf couldn't extract text, try rendering pages to images
        # (requires `pdf2image` and a PDF backend like poppler) and OCR them.
        if HAS_PDF2IMAGE:
            return _run_ocr_on_pdf(file_path)
        return _run_ocr_on_image(file_path)

    if ext in (".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"):
        return _run_ocr_on_image(file_path)

    if not HAS_OCR:
        return "", (
            "Unsupported file type or OCR not installed. Use .txt, .pdf, or an image, "
            "or run: pip install easyocr pypdf pillow opencv-python-headless"
        )
    return _run_ocr_on_image(file_path)


def parse_echo_parameters(text: str) -> dict:
    params = {}

    ef_match = re.search(
        r"(?:EF|Ejection Fraction)[\s:=]*(\d{1,3}(?:\.\d+)?)\s*%", text, re.IGNORECASE
    )
    if ef_match:
        params["ef"] = float(ef_match.group(1))

    lvedd_match = re.search(
        r"(?:LVEDD|LVIDd|LV End Diastolic)[\s:=]*(\d+\.?\d*)\s*(mm|cm)?",
        text,
        re.IGNORECASE,
    )
    if lvedd_match:
        val = float(lvedd_match.group(1))
        unit = lvedd_match.group(2)
        if unit and unit.lower() == "cm":
            val *= 10
        params["lvedd"] = val

    lvesd_match = re.search(
        r"(?:LVESD|LVIDs|LV End Systolic)[\s:=]*(\d+\.?\d*)\s*(mm|cm)?",
        text,
        re.IGNORECASE,
    )
    if lvesd_match:
        val = float(lvesd_match.group(1))
        unit = lvesd_match.group(2)
        if unit and unit.lower() == "cm":
            val *= 10
        params["lvesd"] = val

    hr_match = re.search(
        r"(?:HR|Heart Rate)[\s:=]*(\d{2,3})\s*(bpm)?", text, re.IGNORECASE
    )
    if hr_match:
        params["hr"] = float(hr_match.group(1))

    return params


def process_report(file_path: str) -> Tuple[dict, Optional[str]]:
    text, note = extract_text(file_path)
    parameters = parse_echo_parameters(text)
    if not parameters and note is None and not text.strip():
        note = "No readable text found in this file."
    elif not parameters and note is None:
        note = "Text was read but no echo measurements were detected. Enter values manually."
    return parameters, note
