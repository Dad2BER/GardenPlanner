#!/usr/bin/env python3
"""GardenPlanner development server — port 3000."""
import json, os, mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT      = Path(__file__).parent
DATA_DIR  = ROOT / "data"
DATA_FILE = DATA_DIR / "gardens.json"
DATA_DIR.mkdir(exist_ok=True)

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".ico":  "image/x-icon",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
}

class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/data":
            body = DATA_FILE.read_bytes() if DATA_FILE.exists() else b"null"
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._cors()
            self.end_headers()
            self.wfile.write(body)
            return
        # Serve static files
        if path == "/":
            path = "/index.html"
        file_path = ROOT / path.lstrip("/")
        if file_path.exists() and file_path.is_file():
            ext  = file_path.suffix.lower()
            mime = MIME.get(ext, "application/octet-stream")
            data = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self._cors()
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/data":
            length = int(self.headers.get("Content-Length", 0))
            body   = self.rfile.read(length)
            # Atomic write
            tmp = DATA_FILE.with_suffix(".tmp")
            tmp.write_bytes(body)
            tmp.replace(DATA_FILE)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        pass  # suppress request noise

if __name__ == "__main__":
    PORT = 3000
    with ThreadingHTTPServer(("", PORT), Handler) as srv:
        print(f"GardenPlanner  →  http://localhost:{PORT}")
        srv.serve_forever()
