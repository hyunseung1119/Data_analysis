"""
Logging Middleware
"""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class LoggingMiddleware(BaseHTTPMiddleware):
    """Request logging middleware"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log request
        print(
            f"[{request.method}] {request.url.path} "
            f"- {response.status_code} "
            f"- {duration:.3f}s"
        )
        
        return response
