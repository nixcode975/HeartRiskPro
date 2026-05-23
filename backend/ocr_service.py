import re
import os

try:
    from paddleocr import PaddleOCR
    HAS_PADDLE = True
except ImportError:
    HAS_PADDLE = False
    try:
        import easyocr
        HAS_EASYOCR = True
    except ImportError:
        HAS_EASYOCR = False

def init_ocr():
    if HAS_PADDLE:
        # use_angle_cls=True to rotate images automatically
        return PaddleOCR(use_angle_cls=True, lang='en')
    elif HAS_EASYOCR:
        return easyocr.Reader(['en'])
    else:
        return None

ocr_reader = init_ocr()

def extract_text(file_path: str) -> str:
    if not ocr_reader:
        return "OCR library not installed. Please install paddleocr or easyocr."
        
    extracted_text = []
    
    if HAS_PADDLE:
        result = ocr_reader.ocr(file_path, cls=True)
        if result and result[0]:
            for line in result[0]:
                extracted_text.append(line[1][0])
    elif HAS_EASYOCR:
        result = ocr_reader.readtext(file_path)
        for line in result:
            extracted_text.append(line[1])
            
    return " ".join(extracted_text)

def parse_echo_parameters(text: str) -> dict:
    """
    Parses OCR text to find key echocardiography parameters.
    """
    params = {}
    
    # Example regex patterns for common echo parameters
    # EF: 55%, Ejection Fraction 60%
    ef_match = re.search(r'(?:EF|Ejection Fraction)[\s:=]*(\d{2,3})\s*%', text, re.IGNORECASE)
    if ef_match:
        params['ef'] = float(ef_match.group(1))
        
    # LVEDD: 45mm, LVIDd 4.5 cm
    lvedd_match = re.search(r'(?:LVEDD|LVIDd|LV End Diastolic)[\s:=]*(\d+\.?\d*)\s*(mm|cm)?', text, re.IGNORECASE)
    if lvedd_match:
        val = float(lvedd_match.group(1))
        unit = lvedd_match.group(2)
        if unit and unit.lower() == 'cm':
            val *= 10 # convert to mm
        params['lvedd'] = val
        
    # LVESD: 30mm
    lvesd_match = re.search(r'(?:LVESD|LVIDs|LV End Systolic)[\s:=]*(\d+\.?\d*)\s*(mm|cm)?', text, re.IGNORECASE)
    if lvesd_match:
        val = float(lvesd_match.group(1))
        unit = lvesd_match.group(2)
        if unit and unit.lower() == 'cm':
            val *= 10 # convert to mm
        params['lvesd'] = val
        
    # Heart Rate
    hr_match = re.search(r'(?:HR|Heart Rate)[\s:=]*(\d{2,3})\s*(bpm)?', text, re.IGNORECASE)
    if hr_match:
        params['hr'] = float(hr_match.group(1))
        
    return params

def process_report(file_path: str) -> dict:
    text = extract_text(file_path)
    parameters = parse_echo_parameters(text)
    return parameters
