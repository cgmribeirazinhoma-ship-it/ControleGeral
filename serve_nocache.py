#!/usr/bin/env python3
"""Servidor HTTP com headers no-cache para desenvolvimento."""
import http.server
import socketserver

PORT = 3000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # silencia logs

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Servidor rodando em http://localhost:{PORT} (sem cache)")
    httpd.serve_forever()
