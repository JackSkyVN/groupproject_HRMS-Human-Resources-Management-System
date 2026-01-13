#!/usr/bin/env python3
"""
Simple HTTP Server with SPA (Single Page Application) support
All routes will fallback to index.html for client-side routing
"""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 8080

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler with SPA routing support"""
    
    def do_GET(self):
        """Handle GET requests with SPA fallback"""
        # Lấy đường dẫn file
        path = self.translate_path(self.path)
        
        # Nếu yêu cầu thư mục, thử index.html
        if os.path.isdir(path):
            index_path = os.path.join(path, 'index.html')
            if os.path.exists(index_path):
                self.path = self.path.rstrip('/') + '/index.html'
                return super().do_GET()
        
        # Nếu file tồn tại, serve bình thường
        if os.path.exists(path) and os.path.isfile(path):
            return super().do_GET()
        
        # Nếu file không tồn tại, kiểm tra có phải route không
        # Fallback đến index.html chính cho SPA routing
        if not os.path.exists(path):
            # Tìm index.html trong thư mục cha
            # Ví dụ: /finova/admin/employees → serve /finova/index.html
            parts = self.path.strip('/').split('/')
            
            # Thử finova/index.html trước
            if 'finova' in parts:
                finova_index = os.path.join(os.getcwd(), 'finova', 'index.html')
                if os.path.exists(finova_index):
                    self.path = '/finova/index.html'
                    return super().do_GET()
            
            # Fallback đến root index.html
            root_index = os.path.join(os.getcwd(), 'index.html')
            if os.path.exists(root_index):
                self.path = '/index.html'
                return super().do_GET()
        
        # Nếu vẫn không tìm thấy, trả về 404
        return super().do_GET()

    def end_headers(self):
        """Add CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

if __name__ == '__main__':
    Handler = SPAHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running on http://localhost:{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
