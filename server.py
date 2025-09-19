#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import urlparse

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers necesarios para módulos ES6 externos
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_GET(self):
        # Manejar favicon.ico si no existe
        if self.path == '/favicon.ico':
            self.send_response(200)
            self.send_header('Content-Type', 'image/svg+xml')
            self.end_headers()
            favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#333"/>
                <text x="50" y="70" font-size="60" text-anchor="middle" fill="white">🗃️</text>
            </svg>'''
            self.wfile.write(favicon_svg.encode())
            return
        
        super().do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def main():
    PORT = 8000
    
    # Cambiar al directorio del script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print(f"🚀 Servidor easySQL corriendo en http://localhost:{PORT}")
        print(f"📁 Sirviendo archivos desde: {script_dir}")
        print("⚠️  Solo para desarrollo - incluye headers CORS permisivos")
        print("🛑 Presiona Ctrl+C para detener el servidor")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🔴 Servidor detenido")

if __name__ == "__main__":
    main()
