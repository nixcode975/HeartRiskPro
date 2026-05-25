$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = "http://127.0.0.1:8000"
$HealthUrl = "$Url/health"

$PythonCandidates = @(
    (Join-Path $Root ".venv\Scripts\python.exe"),
    (Join-Path $Root "backend\venv\Scripts\python.exe"),
    "python"
)

$Python = $null
foreach ($Candidate in $PythonCandidates) {
    if ((Test-Path $Candidate) -or (Get-Command $Candidate -ErrorAction SilentlyContinue)) {
        $Python = $Candidate
        break
    }
}

if (-not $Python) {
    throw "Python was not found. Install Python or create .venv before running this script."
}

Set-Location $Root

Start-Job -ScriptBlock {
    param($HealthUrl, $Url)

    for ($i = 0; $i -lt 60; $i++) {
        try {
            Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 1 | Out-Null
            Start-Process $Url
            return
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
} -ArgumentList $HealthUrl, $Url | Out-Null

Write-Host "Starting HeartRisk Pro at $Url"
Write-Host "Keep this terminal open while using the app."
& $Python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
