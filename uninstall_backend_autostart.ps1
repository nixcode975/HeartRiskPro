$ErrorActionPreference = "Stop"

$TaskName = "HeartRiskProBackend"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed $TaskName autostart task."
} else {
    Write-Host "$TaskName autostart task is not installed."
}
