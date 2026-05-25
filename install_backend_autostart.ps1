$ErrorActionPreference = "Stop"

$TaskName = "HeartRiskProBackend"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$Url = "http://127.0.0.1:8000"
$HealthUrl = "$Url/health"

if (-not (Test-Path $Python)) {
    $Python = "python"
}

if (-not (Test-Path $Backend)) {
    throw "Backend folder was not found at $Backend"
}

$Action = New-ScheduledTaskAction `
    -Execute $Python `
    -Argument "-m uvicorn main:app --host 127.0.0.1 --port 8000" `
    -WorkingDirectory $Backend

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0)

$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Starts the HeartRisk Pro FastAPI backend on 127.0.0.1:8000 at user login." `
    -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 1 | Out-Null
        Write-Host "HeartRisk backend autostart is installed and running at $Url"
        Start-Process $Url
        exit 0
    } catch {
        Start-Sleep -Milliseconds 500
    }
}

throw "Autostart task was installed, but the backend did not answer $HealthUrl yet."
