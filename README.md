# HeartRisk Pro: AI-Powered Echocardiography Upgrade

HeartRisk Pro is an advanced cardiovascular risk assessment platform that uses the ACC/AHA Pooled Cohort Equations combined with an AI-powered echocardiography module.

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS (no build step needed)
- **Backend**: FastAPI (Python)
- **AI/ML**: XGBoost (mocked until dataset is provided)
- **OCR**: PaddleOCR / EasyOCR

## Prerequisites
- Python 3.9+
- A modern web browser
- Required system dependencies for PaddleOCR/EasyOCR (e.g., C++ Build Tools on Windows).

## Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 2. Running the Backend API
Start the FastAPI server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The API will be available at `http://localhost:8000`. You can view the docs at `http://localhost:8000/docs`.

### 3. Running the Frontend
The frontend consists of static files. You can serve them using any static file server:
```bash
# From the root directory (outside backend/)
python -m http.server 3000
```
Then navigate to `http://localhost:3000` in your web browser.

### 4. Machine Learning Pipeline (Pending Dataset)
To train the actual ML model, the Kaggle echocardiography dataset (CSV/XLSX) must be placed in the project folder. Once added, a training script will process the data and output `cvd_echo_model.pkl` to the backend directory.

## Disclaimer
This tool provides AI-assisted cardiovascular risk estimation and is not a substitute for professional medical advice or diagnosis. Always consult a qualified healthcare provider.