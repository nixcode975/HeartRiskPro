from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import shutil
import os

from ocr_service import process_report
from ml_service import predict_risk

app = FastAPI(
    title="HeartRisk Pro AI API",
    description="AI-assisted cardiovascular risk estimation API",
    version="1.0.0"
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EchoParams(BaseModel):
    ef: Optional[float] = None  # Ejection Fraction (%)
    lvedd: Optional[float] = None # Left Ventricular End-Diastolic Dimension (mm)
    lvesd: Optional[float] = None # Left Ventricular End-Systolic Dimension (mm)
    hr: Optional[float] = None # Heart Rate
    sbp: Optional[float] = None # Systolic Blood Pressure
    age: Optional[float] = None
    cholesterol: Optional[float] = None
    # Add other parameters as needed based on the dataset

@app.get("/")
def read_root():
    return {"message": "HeartRisk Pro AI API is running"}

@app.post("/upload-echo-report")
async def upload_echo_report(file: UploadFile = File(...)):
    """
    Accepts an uploaded echocardiography report (PDF or image).
    Runs OCR and extracts medical parameters.
    """
    try:
        # Create temp directory if not exists
        os.makedirs("temp", exist_ok=True)
        file_path = f"temp/{file.filename}"
        
        # Save file temporarily
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process report with OCR
        extracted_data = process_report(file_path)
        
        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {
            "status": "success",
            "extracted_parameters": extracted_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-echo-risk")
def predict_echo_risk(params: EchoParams):
    """
    Accepts extracted parameters and returns the AI risk prediction.
    """
    try:
        prediction_result = predict_risk(params.dict())
        return {
            "status": "success",
            "prediction": prediction_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
