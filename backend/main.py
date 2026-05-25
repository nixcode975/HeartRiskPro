# pyrefly: ignore [missing-import]

from fastapi import FastAPI, UploadFile, File, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import shutil
import os
import tempfile
from pathlib import Path

try:
    from .ocr_service import process_report, ocr_status
    from .ml_service import predict_risk, is_model_loadable
except ImportError:
    from ocr_service import process_report, ocr_status
    from ml_service import predict_risk, is_model_loadable

ROOT_DIR = Path(__file__).resolve().parent.parent
TEMP_DIR = Path(tempfile.gettempdir()) / "heartrisk_pro_uploads"

app = FastAPI(
    title="HeartRisk Pro AI API",
    description="AI-assisted cardiovascular risk estimation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EchoParams(BaseModel):
    ef: Optional[float] = None
    lvedd: Optional[float] = None
    lvesd: Optional[float] = None
    hr: Optional[float] = None
    sbp: Optional[float] = None
    age: Optional[float] = None
    cholesterol: Optional[float] = None


@app.get("/api")
def api_info():
    return {"message": "HeartRisk Pro AI API is running"}


@app.get("/health")
def health():
    status = ocr_status()
    return {"status": "ok", "ocr": status}


@app.post("/upload-echo-report")
async def upload_echo_report(file: UploadFile = File(...)):
    """Accept echo report upload, run OCR/text extraction, return parameters."""
    file_path = None
    try:
        TEMP_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = os.path.basename(file.filename or "upload")
        file_path = TEMP_DIR / safe_name

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_data, note = process_report(str(file_path))
        return {
            "status": "success",
            "extracted_parameters": extracted_data,
            "ocr_available": ocr_status()["available"],
            "message": note,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)


@app.post("/predict-echo-risk")
def predict_echo_risk(params: EchoParams):
    try:
        payload = params.model_dump() if hasattr(params, "model_dump") else params.dict()
        prediction_result = predict_risk(payload)
        return {
            "status": "success",
            "prediction": prediction_result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/model-status")
def model_status():
    info = is_model_loadable()
    return {
        "status": "ok",
        "model_exists": info.get("exists", False),
        "model_loadable": info.get("loadable", False),
        "error": info.get("error"),
    }


# Serve frontend from project root (same origin — no CORS issues when using port 8000)
app.mount("/", StaticFiles(directory=str(ROOT_DIR), html=True), name="frontend")
