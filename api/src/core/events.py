"""Reusable SSE event hub used to push live "change" events to connected clients."""
import asyncio
import json
from typing import AsyncIterator

from fastapi import Request
from fastapi.responses import StreamingResponse


class EventHub:
    def __init__(self) -> None:
        self._queues: set[asyncio.Queue] = set()

    def broadcast(self, message: dict | None = None) -> None:
        payload = message or {"type": "change"}
        for q in list(self._queues):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass

    async def stream(self, request: Request) -> StreamingResponse:
        queue: asyncio.Queue = asyncio.Queue()

        async def event_generator() -> AsyncIterator[str]:
            self._queues.add(queue)
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        msg = await asyncio.wait_for(queue.get(), timeout=15)
                        event = msg.get("type", "message")
                        yield f"event: {event}\ndata: {json.dumps(msg)}\n\n"
                    except asyncio.TimeoutError:
                        yield 'data: {"type": "ping"}\n\n'
            except asyncio.CancelledError:
                pass
            finally:
                self._queues.discard(queue)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )


companyprofile_hub = EventHub()
