"""Smoke-test upload-echo-report."""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
report = ROOT / "temp" / "test_report.txt"
boundary = "----HeartRiskBoundary"
body = (
    f"--{boundary}\r\n"
    'Content-Disposition: form-data; name="file"; filename="test_report.txt"\r\n'
    "Content-Type: text/plain\r\n\r\n"
    f"{report.read_text(encoding='utf-8')}\r\n"
    f"--{boundary}--\r\n"
).encode()

req = urllib.request.Request(
    "http://127.0.0.1:8000/upload-echo-report",
    data=body,
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Origin": "http://127.0.0.1:3000",
    },
    method="POST",
)
resp = urllib.request.urlopen(req, timeout=10)
data = json.loads(resp.read().decode())
print(json.dumps(data, indent=2))
assert data.get("status") == "success"
print("OK")
