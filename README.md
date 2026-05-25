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

### 2. One-command start (recommended)
From the project root on Windows:
```powershell
.\START_HEARTRISK_PRO.bat
```

Or:
```powershell
.\start_app.ps1
```

This starts the FastAPI backend on `http://127.0.0.1:8000` and opens the website once the backend health check is ready.

In VS Code, run the launch configuration **Open HeartRisk Pro (starts backend)** to start the backend automatically before the browser opens.

The workspace task is also configured to start the backend when this folder opens in VS Code. If VS Code asks whether to allow automatic tasks for this folder, choose **Allow**.

For full Windows login autostart, run:
```powershell
.\INSTALL_BACKEND_AUTOSTART.bat
```

To remove that login autostart later:
```powershell
.\UNINSTALL_BACKEND_AUTOSTART.bat
```

### 3. Running the Backend API manually
From the **project root** (recommended):
```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Or from the `backend` directory:
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
The API will be available at `http://localhost:8000`. You can view the docs at `http://localhost:8000/docs`.

### 4. Running the Frontend (recommended: same server as API)

The backend serves the website and API together (avoids CORS / connection issues):

```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000** in your browser.

**Alternative** (frontend on port 3000): keep the backend running on 8000, then in another terminal:

```bash
python -m http.server 3000
```

Open `http://localhost:3000`. Echo upload requires the backend on port 8000.

**Echo upload without OCR installed:** upload a `.txt` report (e.g. `temp/test_report.txt`) or install full OCR deps: `pip install -r backend/requirements.txt`.

### 5. Machine Learning Pipeline (Pending Dataset)
To train the actual ML model, the Kaggle echocardiography dataset (CSV/XLSX) must be placed in the project folder. Once added, a training script will process the data and output `cvd_echo_model.pkl` to the backend directory.

## Disclaimer
This tool provides AI-assisted cardiovascular risk estimation and is not a substitute for professional medical advice or diagnosis. Always consult a qualified healthcare provider.
