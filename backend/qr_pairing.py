"""Ephemeral QR relay for the existing single-worker Render service.
No decoded content or pairing credentials are written to the database.
"""
import asyncio
import os
import secrets
import time
from fastapi import APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/api/qr-pair")
sessions = {}
TTL = 300
creation_times = {}

async def send(ws, data):
    if ws:
        try:
            await ws.send_json(data)
        except (RuntimeError, WebSocketDisconnect):
            pass

async def expire(sid):
    await asyncio.sleep(TTL)
    session = sessions.pop(sid, None)
    if session:
        for role in ("desktop", "phone"):
            ws = session.get(role)
            await send(ws, {"state": "expired"})
            if ws:
                try:
                    await ws.close(code=4001)
                except RuntimeError:
                    pass

@router.post("")
async def create_session(request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    now = time.time()
    for ip, timestamps in list(creation_times.items()):
        creation_times[ip] = [stamp for stamp in timestamps if stamp > now - 60]
        if not creation_times[ip]:
            del creation_times[ip]
    ip = request.client.host if request.client else "unknown"
    timestamps = creation_times.setdefault(ip, [])
    if len(timestamps) >= 20:
        raise HTTPException(429, "Too many pairing sessions. Try again in a minute.", headers={"Retry-After": "60"})
    timestamps.append(now)
    if len(sessions) >= 1000:
        raise HTTPException(503, "Pairing is busy. Try again shortly.")
    sid = secrets.token_urlsafe(24)
    desktop_token, phone_token = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    sessions[sid] = {"desktop_token": desktop_token, "phone_token": phone_token,
                     "expires": time.time() + TTL, "state": "waiting", "content": None,
                     "desktop": None, "phone": None, "device": None}
    sessions[sid]["timer"] = asyncio.create_task(expire(sid))
    return {"id": sid, "desktop_token": desktop_token, "phone_token": phone_token,
            "expires_at": sessions[sid]["expires"]}

@router.websocket("/{sid}")
async def relay(ws: WebSocket, sid: str):
    origins = [x.strip().rstrip("/") for x in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")]
    origin = ws.headers.get("origin", "").rstrip("/")
    if origin and origin not in origins and origin != f"https://{ws.headers.get('host')}":
        await ws.close(code=1008)
        return
    await ws.accept()
    session, role = None, None
    try:
        auth = await asyncio.wait_for(ws.receive_json(), timeout=10)
        session = sessions.get(sid)
        role = auth.get("role")
        if not session or time.time() >= session["expires"]:
            await send(ws, {"state": "expired"})
            await ws.close(code=4001)
            return
        token = auth.get("token")
        if role not in ("desktop", "phone") or not isinstance(token, str) or not secrets.compare_digest(token, session[role + "_token"]):
            await ws.close(code=1008)
            return
        if role == "phone":
            device = auth.get("device")
            if not isinstance(device, str) or not 20 <= len(device) <= 100 or (session["device"] and session["device"] != device):
                await ws.close(code=1008)
                return
            session["device"] = device
        if session[role]:
            await ws.close(code=4009)
            return
        session[role] = ws
        if role == "phone" and session["state"] == "waiting":
            session["state"] = "connected"
        await send(ws, {"state": session["state"], "content": session["content"] if role == "desktop" else None})
        await send(session["desktop"], {"state": session["state"], "content": session["content"]})
        while True:
            msg = await ws.receive_json()
            if not isinstance(msg, dict):
                await ws.close(code=1008)
                break
            if role == "phone" and msg.get("type") == "ready" and session["state"] in ("connected", "ready"):
                session["state"] = "ready"
                await send(session["desktop"], {"state": "ready"})
                await send(ws, {"state": "ready"})
            elif role == "phone" and msg.get("type") == "scan":
                content = msg.get("content")
                if not isinstance(content, str) or not content.strip() or len(content) > 6000 or "\x00" in content:
                    await send(ws, {"state": "invalid", "message": "QR content must contain 1–6000 characters."})
                    continue
                if session["state"] not in ("connected", "ready"):
                    await send(ws, {"state": session["state"]})
                    continue
                session["content"] = content
                session["state"] = "detected"
                await send(ws, {"state": "detected"})
                await send(session["desktop"], {"state": "detected", "content": content})
            elif role == "desktop" and msg.get("type") == "analyzing" and session["state"] == "detected":
                session["state"] = "analyzing"
                await send(session["phone"], {"state": "analyzing"})
            elif role == "desktop" and msg.get("type") in ("complete", "failed") and session["state"] in ("detected", "analyzing"):
                session["content"] = None
                session["state"] = "complete" if msg["type"] == "complete" else "failed"
                await send(session["phone"], {"state": session["state"]})
                await send(ws, {"state": session["state"]})
                session["timer"].cancel()
                sessions.pop(sid, None)
                if session["phone"]:
                    await session["phone"].close(code=1000)
                await ws.close(code=1000)
                break
            elif role == "desktop" and msg.get("type") == "cancel":
                session["timer"].cancel()
                sessions.pop(sid, None)
                session["content"] = None
                await send(session["phone"], {"state": "expired"})
                if session["phone"]:
                    await session["phone"].close(code=4001)
                await ws.close(code=1000)
                break
            elif msg.get("type") == "ping":
                await send(ws, {"state": "disconnected" if role == "desktop" and session["device"] and not session["phone"] and session["state"] in ("connected", "ready") else session["state"]})
    except (WebSocketDisconnect, asyncio.TimeoutError, ValueError, TypeError, AttributeError):
        pass
    finally:
        if session and role in ("desktop", "phone") and session.get(role) is ws:
            session[role] = None
            if role == "phone" and session["state"] not in ("complete", "failed"):
                await send(session["desktop"], {"state": "disconnected"})

async def shutdown_pairing():
    for session in list(sessions.values()):
        session["timer"].cancel()
        for role in ("desktop", "phone"):
            if session[role]:
                await session[role].close(code=1012)
    sessions.clear()
