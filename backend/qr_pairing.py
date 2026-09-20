"""Temporary capability-authenticated HTTPS QR relay for one Render worker."""
import asyncio
import secrets
import time
from typing import Literal, Optional
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/qr-pair")
sessions = {}
TTL = 300
creation_times = {}

async def expire(sid, delay):
    await asyncio.sleep(delay)
    sessions.pop(sid, None)

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
                     "expires": now + TTL, "state": "waiting", "content": None,
                     "device": None, "phone_seen": 0}
    sessions[sid]["timer"] = asyncio.create_task(expire(sid, TTL))
    return {"id": sid, "desktop_token": desktop_token, "phone_token": phone_token,
            "expires_at": now + TTL}

class Exchange(BaseModel):
    role: Literal["desktop", "phone"]
    token: str = Field(min_length=20, max_length=100)
    device: Optional[str] = Field(default=None, min_length=20, max_length=100)
    type: Literal["ping", "ready", "scan", "analyzing", "complete", "failed", "cancel"] = "ping"
    content: Optional[str] = Field(default=None, min_length=1, max_length=6000)

@router.post("/{sid}/exchange")
async def exchange(sid: str, data: Exchange, response: Response):
    response.headers["Cache-Control"] = "no-store"
    session = sessions.get(sid)
    if not session or time.time() >= session["expires"]:
        if session:
            session["timer"].cancel()
            sessions.pop(sid, None)
        raise HTTPException(410, "Session expired. Start a new scan on your desktop.")
    if not secrets.compare_digest(data.token, session[data.role + "_token"]):
        raise HTTPException(403, "Invalid pairing credential.")
    if data.role == "phone":
        if not data.device or (session["device"] and session["device"] != data.device):
            raise HTTPException(403, "This session is already paired to another phone.")
        session["device"] = data.device
        session["phone_seen"] = time.time()
        if session["state"] == "waiting":
            session["state"] = "connected"
    action = data.type
    if action == "ready":
        if data.role != "phone":
            raise HTTPException(403, "Only the paired phone can register its camera.")
        if session["state"] in ("connected", "ready"):
            session["state"] = "ready"
    elif action == "scan":
        if data.role != "phone":
            raise HTTPException(403, "Only the paired phone can submit a scan.")
        if not data.content or not data.content.strip() or "\x00" in data.content:
            raise HTTPException(422, "QR content must contain 1–6000 characters.")
        if session["state"] in ("connected", "ready"):
            session["content"] = data.content
            session["state"] = "detected"
        # Retried delivery is idempotent and cannot replace an accepted scan.
    elif action in ("analyzing", "complete", "failed", "cancel"):
        if data.role != "desktop":
            raise HTTPException(403, "Only the owning desktop can update analysis state.")
        if action == "cancel":
            session["timer"].cancel()
            sessions.pop(sid, None)
            return {"state": "expired", "content": None}
        if action == "analyzing" and session["state"] == "detected":
            session["state"] = "analyzing"
        if action in ("complete", "failed") and session["state"] in ("detected", "analyzing"):
            session["state"] = action
            session["content"] = None
            # Keep only terminal metadata briefly so the next phone poll sees it,
            # including retries after a response is lost. Original expiry still applies.
            session["timer"].cancel()
            session["timer"] = asyncio.create_task(expire(sid, min(30, session["expires"] - time.time())))
    state = session["state"]
    if data.role == "desktop" and session["device"] and time.time() - session["phone_seen"] > 15 and state in ("connected", "ready"):
        state = "disconnected"
    return {"state": state, "content": session["content"] if data.role == "desktop" else None}

async def shutdown_pairing():
    for session in list(sessions.values()):
        session["timer"].cancel()
    sessions.clear()
