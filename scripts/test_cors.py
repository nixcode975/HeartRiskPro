"""Check CORS headers for browser-style cross-origin upload."""
import urllib.request

req = urllib.request.Request(
    "http://127.0.0.1:8000/upload-echo-report",
    method="OPTIONS",
    headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
    },
)
resp = urllib.request.urlopen(req, timeout=5)
print("status", resp.status)
for key in (
    "access-control-allow-origin",
    "access-control-allow-credentials",
    "access-control-allow-methods",
):
    print(key, resp.headers.get(key))
