"""Middleware for consistent JSON error responses that still carry CORS headers.

FastAPI's `@app.exception_handler(Exception)` is routed to Starlette's
ServerErrorMiddleware, which sits OUTSIDE CORSMiddleware. Exceptions handled
there produce 500 responses WITHOUT any CORS headers, so browsers report a
misleading "blocked by CORS policy" error even though the request actually
reached the server and failed with 500.

This middleware catches unhandled exceptions INSIDE the CORS middleware and
returns a JSON 500 that flows back through CORSMiddleware. It MUST be
registered before CORSMiddleware (see src/main.py) so CORS wraps it.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("ptdarrahman")


class ServerErrorJSONMiddleware:
    """Return a JSON 500 (with CORS headers) for any unhandled exception."""

    def __init__(self, app, handler=None):
        self.app = app
        self.handler = handler or self.default_handler

    @staticmethod
    def default_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = False

        async def guarded_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, guarded_send)
        except Exception as exc:
            if started:
                # Response already streaming (e.g. SSE); can't emit JSON now.
                raise
            logger.exception("Unhandled error on %s %s", scope["method"], scope["path"])
            response = self.handler(Request(scope, receive), exc)
            await response(scope, receive, send)


def add_server_error_middleware(app: FastAPI) -> None:
    """Register the middleware so it sits inside the CORS middleware."""
    app.add_middleware(ServerErrorJSONMiddleware)
