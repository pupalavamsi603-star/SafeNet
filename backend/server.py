from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import time
import uuid
import logging
import bcrypt
import jwt
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import openai
from seed_data import SCAM_TYPES, SAFETY_TIPS, QUIZ_QUESTIONS, BLOG_POSTS

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini')
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

app = FastAPI(title="SafeNet API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("safenet")


# ---------- helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    # Cross-site cookies (SameSite=None; Secure) only needed when serving an https frontend on another domain
    is_prod = "https://" in os.environ.get('CORS_ORIGINS', '')
    response.set_cookie("access_token", access, httponly=True, secure=is_prod, samesite="none" if is_prod else "lax", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=is_prod, samesite="none" if is_prod else "lax", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------- rate limiting ----------
def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

class RateLimiter:
    """Sliding-window in-memory rate limiter, keyed per client IP."""
    def __init__(self, max_requests: int, window_seconds: int, name: str):
        self.max_requests = max_requests
        self.window = window_seconds
        self.name = name
        self.hits: dict = defaultdict(deque)

    def __call__(self, request: Request):
        now = time.monotonic()
        key = _client_ip(request)
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.max_requests:
            retry_after = max(1, int(self.window - (now - q[0])) + 1)
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please wait {retry_after} seconds and try again.",
                headers={"Retry-After": str(retry_after)},
            )
        q.append(now)
        # opportunistic cleanup so idle IPs don't accumulate forever
        if len(self.hits) > 10_000:
            for k in [k for k, v in self.hits.items() if not v or now - v[-1] > self.window]:
                self.hits.pop(k, None)

ai_chat_limiter = RateLimiter(max_requests=20, window_seconds=60, name="ai_chat")
ai_detect_limiter = RateLimiter(max_requests=10, window_seconds=60, name="ai_detect")
ai_qr_limiter = RateLimiter(max_requests=10, window_seconds=60, name="ai_qr")
auth_limiter = RateLimiter(max_requests=10, window_seconds=60, name="auth")


# ---------- models ----------
class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class ScamTypeInput(BaseModel):
    title: str
    slug: str = ""
    icon: str = "AlertTriangle"
    severity: str = "high"
    description: str
    how_it_works: str
    warning_signs: List[str] = []
    prevention_tips: List[str] = []
    real_example: str = ""

class SafetyTipInput(BaseModel):
    title: str
    slug: str = ""
    icon: str = "Shield"
    category: str = "General"
    summary: str
    points: List[str] = []

class QuizQuestionInput(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str

class ReportInput(BaseModel):
    scam_category: str
    description: str = Field(min_length=10, max_length=5000)
    scammer_phone: str = ""
    scammer_url: str = ""
    amount_lost: str = ""
    screenshot: str = ""
    reporter_name: str = ""
    reporter_email: str = ""

class ContactInput(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    subject: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=5, max_length=5000)

class ChatInput(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)

class DetectInput(BaseModel):
    message: str = Field(min_length=5, max_length=6000)

class QRScanInput(BaseModel):
    content: str = Field(min_length=1, max_length=6000)

class GoogleAuthInput(BaseModel):
    credential: str = Field(min_length=20)

class QuizSubmitInput(BaseModel):
    name: str = ""
    score: int
    total: int


# ---------- auth routes ----------
@api_router.post("/auth/register")
async def register(data: RegisterInput, response: Response, _=Depends(auth_limiter)):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {"id": str(uuid.uuid4()), "name": data.name.strip(), "email": email, "role": "user", "created_at": now_iso()}
    await db.users.insert_one({**user, "password_hash": hash_password(data.password)})
    set_auth_cookies(response, create_access_token(user["id"], email), create_refresh_token(user["id"]))
    return user

@api_router.post("/auth/login")
async def login(data: LoginInput, response: Response, _=Depends(auth_limiter)):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_auth_cookies(response, create_access_token(user["id"], email), create_refresh_token(user["id"]))
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}

@api_router.post("/auth/google")
async def google_auth(data: GoogleAuthInput, response: Response, _=Depends(auth_limiter)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server")
    import httpx
    async with httpx.AsyncClient(timeout=10) as hc:
        resp = await hc.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": data.credential})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    info = resp.json()
    if info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token audience mismatch")
    if info.get("email_verified") not in (True, "true"):
        raise HTTPException(status_code=401, detail="Google email not verified")
    email = info["email"].lower().strip()
    name = info.get("name") or email.split("@")[0]

    user = await db.users.find_one({"email": email})
    if user:
        # link google to existing account
        if user.get("auth_provider") != "google":
            await db.users.update_one({"id": user["id"]}, {"$set": {"auth_provider": "google", "picture": info.get("picture", "")}})
    else:
        user = {
            "id": str(uuid.uuid4()), "name": name, "email": email, "role": "user",
            "auth_provider": "google", "picture": info.get("picture", ""), "created_at": now_iso(),
        }
        await db.users.insert_one({**user})
    set_auth_cookies(response, create_access_token(user["id"], email), create_refresh_token(user["id"]))
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user.get("role", "user")}

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response, _=Depends(auth_limiter)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # rotate both tokens
    set_auth_cookies(response, create_access_token(user["id"], user["email"]), create_refresh_token(user["id"]))
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- public content ----------
@api_router.get("/scam-types")
async def list_scam_types():
    return await db.scam_types.find({}, {"_id": 0}).to_list(100)

@api_router.get("/scam-types/{slug}")
async def get_scam_type(slug: str):
    doc = await db.scam_types.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Scam type not found")
    return doc

@api_router.get("/safety-tips")
async def list_safety_tips():
    return await db.safety_tips.find({}, {"_id": 0}).to_list(100)

@api_router.get("/quiz/questions")
async def quiz_questions():
    return await db.quiz_questions.find({}, {"_id": 0}).to_list(50)

@api_router.post("/quiz/submit")
async def quiz_submit(data: QuizSubmitInput):
    doc = {"id": str(uuid.uuid4()), "name": data.name, "score": data.score, "total": data.total, "created_at": now_iso()}
    await db.quiz_results.insert_one({**doc})
    return doc

@api_router.get("/blog")
async def list_blog():
    return await db.blog_posts.find({}, {"_id": 0, "content": 0}).to_list(100)

@api_router.get("/blog/{slug}")
async def get_blog(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    return doc

@api_router.get("/search")
async def search(q: str):
    q = q.strip()
    if len(q) < 2:
        return {"scams": [], "tips": [], "blog": []}
    rx = {"$regex": q, "$options": "i"}
    scams = await db.scam_types.find({"$or": [{"title": rx}, {"description": rx}]}, {"_id": 0, "title": 1, "slug": 1, "description": 1}).to_list(5)
    tips = await db.safety_tips.find({"$or": [{"title": rx}, {"summary": rx}]}, {"_id": 0, "title": 1, "slug": 1, "summary": 1}).to_list(5)
    blog = await db.blog_posts.find({"$or": [{"title": rx}, {"excerpt": rx}]}, {"_id": 0, "title": 1, "slug": 1, "excerpt": 1}).to_list(5)
    return {"scams": scams, "tips": tips, "blog": blog}

@api_router.post("/reports")
async def create_report(data: ReportInput):
    if data.screenshot and len(data.screenshot) > 3_000_000:
        raise HTTPException(status_code=400, detail="Screenshot too large (max ~2MB)")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "status": "pending", "created_at": now_iso()}
    await db.reports.insert_one({**doc})
    doc.pop("screenshot", None)
    return doc

@api_router.post("/contact")
async def create_contact(data: ContactInput):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "read": False, "created_at": now_iso()}
    await db.contact_messages.insert_one({**doc})
    return doc


# ---------- AI ----------
CHAT_SYSTEM = (
    "You are SafeBot, the friendly AI cybersecurity assistant of SafeNet, a cyber safety awareness platform. "
    "You explain cyber scams (phishing, OTP fraud, UPI scams, fake jobs, lottery, investment, tech support, social media, "
    "fake shopping, QR code, SIM swap) in simple language, answer cybersecurity questions, give personalized online safety advice, "
    "analyze suspicious messages users paste, and suggest preventive measures. "
    "Be concise, warm, and practical. Use short paragraphs and bullet points. If a user seems to be an active scam victim, "
    "urge them to contact their bank immediately and report to their national cybercrime portal (e.g., cybercrime.gov.in in India, "
    "ic3.gov in the USA). Never ask for passwords, OTPs, or card numbers. Only answer topics related to cybersecurity and online safety; "
    "politely redirect unrelated questions."
)

DETECT_SYSTEM = (
    "You are a scam detection engine. Analyze the message the user provides and respond ONLY with valid JSON, no markdown fences, in this exact schema: "
    '{"risk_level": "safe" | "suspicious" | "dangerous", "risk_score": <0-100 integer>, "scam_type": "<short label or None detected>", '
    '"red_flags": ["<flag1>", "<flag2>"], "explanation": "<2-3 sentence plain-language explanation>", '
    '"advice": ["<action1>", "<action2>", "<action3>"]}'
)

@api_router.post("/ai/chat")
async def ai_chat(data: ChatInput, _=Depends(ai_chat_limiter)):
    history = await db.chat_messages.find({"session_id": data.session_id}, {"_id": 0}).sort("created_at", -1).to_list(10)
    history.reverse()
    context = ""
    if history:
        context = "Previous conversation:\n" + "\n".join(f"{m['role']}: {m['content'][:500]}" for m in history) + "\n\nUser's new message: "
    await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "session_id": data.session_id, "role": "user", "content": data.message, "created_at": now_iso()})

    async def gen():
        full = ""
        ai_client = openai.AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
        for model in (OPENROUTER_MODEL,):
            try:
                msgs = [{"role": "system", "content": CHAT_SYSTEM}]
                if context:
                    msgs.append({"role": "user", "content": context})
                msgs.append({"role": "user", "content": data.message})
                stream = await ai_client.chat.completions.create(
                    model=model,
                    messages=msgs,
                    stream=True,
                )
                async for chunk in stream:
                    text = chunk.choices[0].delta.content or ""
                    if text:
                        full += text
                        yield text
                break
            except Exception as e:
                logger.error(f"AI chat error ({model}): {e}")
                if full:
                    break
        if not full:
            yield "Sorry, I ran into a problem answering that. Please try again in a moment."
        if full:
            await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "session_id": data.session_id, "role": "assistant", "content": full, "created_at": now_iso()})

    return StreamingResponse(gen(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api_router.get("/ai/chat/{session_id}/history")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return msgs

@api_router.post("/ai/detect")
async def ai_detect(data: DetectInput, _=Depends(ai_detect_limiter)):
    import json as jsonlib
    ai_client = openai.AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
    try:
        response = await ai_client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": DETECT_SYSTEM},
                {"role": "user", "content": f"Analyze this message for scam indicators:\n\n{data.message}"},
            ],
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = jsonlib.loads(text.strip())
        await db.detections.insert_one({"id": str(uuid.uuid4()), "message": data.message[:1000], "result": parsed, "created_at": now_iso()})
        return parsed
    except Exception as e:
        logger.error(f"AI detect error: {e}")
        raise HTTPException(status_code=502, detail="Scam analysis failed. Please try again.")


# ---------- QR scan analysis ----------
QR_SYSTEM = (
    "You are a QR code safety analysis engine. The user scanned a QR code and you receive its decoded content "
    "(a URL, UPI/payment link, Wi-Fi config, vCard, or plain text). Assess whether it is safe or a scam. "
    "Pay special attention to: phishing URLs, URL shorteners hiding destinations, fake bank/government domains, "
    "UPI payment requests (upi://pay — scanning to RECEIVE money is a common scam; QR codes are for PAYING only), "
    "APK/app download links, Wi-Fi configs from unknown sources, and lookalike/typosquatted domains. "
    "Respond ONLY with valid JSON, no markdown fences, in this exact schema: "
    '{"risk_level": "safe" | "suspicious" | "dangerous", "risk_score": <0-100 integer>, "content_type": "<URL | UPI Payment | Wi-Fi | Text | Contact | Other>", '
    '"scam_type": "<short label or None detected>", "red_flags": ["<flag1>", "<flag2>"], '
    '"explanation": "<2-3 sentence plain-language explanation>", "advice": ["<action1>", "<action2>", "<action3>"]}'
)

URL_SHORTENERS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "s.id", "v.gd", "ow.ly"}
SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".buzz", ".club", ".work", ".zip", ".icu"}

def qr_heuristics(content: str) -> list:
    """Instant local red-flag checks on decoded QR content, merged with the AI result."""
    import re
    flags = []
    c = content.strip()
    lower = c.lower()
    if lower.startswith("upi://") or "upi://pay" in lower:
        flags.append("UPI payment request — scanning a QR never gives you money, it only sends it")
    if lower.startswith("http://"):
        flags.append("Uses insecure http:// instead of https://")
    m = re.search(r"https?://([^/\s:]+)", lower)
    if m:
        host = m.group(1)
        if host in URL_SHORTENERS or any(host.endswith("." + s) for s in URL_SHORTENERS):
            flags.append(f"Shortened URL ({host}) hides the real destination")
        if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}(:\d+)?", host):
            flags.append("Links directly to a raw IP address instead of a domain")
        if "xn--" in host:
            flags.append("Punycode domain — may impersonate a real site with lookalike characters")
        for tld in SUSPICIOUS_TLDS:
            if host.endswith(tld):
                flags.append(f"Domain uses a TLD ({tld}) frequently abused by scammers")
                break
        if re.search(r"\.(apk|exe|msi|bat|scr)($|\?)", lower):
            flags.append("Direct app/executable download link — a common malware delivery trick")
    if lower.startswith("wifi:"):
        flags.append("Wi-Fi network configuration — only join networks from sources you trust")
    return flags

@api_router.post("/ai/qr")
async def ai_qr(data: QRScanInput, _=Depends(ai_qr_limiter)):
    import json as jsonlib
    local_flags = qr_heuristics(data.content)
    ai_client = openai.AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
    try:
        hint = ("\n\nLocal heuristic checks already flagged: " + "; ".join(local_flags)) if local_flags else ""
        messages = [
            {"role": "system", "content": QR_SYSTEM},
            {"role": "user", "content": f"Analyze this decoded QR code content for scam indicators:\n\n{data.content}{hint}"},
        ]
        response = await ai_client.chat.completions.create(model=OPENROUTER_MODEL, messages=messages)
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = jsonlib.loads(text.strip())
        # merge local heuristic flags the AI may have missed
        existing = {f.lower() for f in parsed.get("red_flags", [])}
        for f in local_flags:
            if f.lower() not in existing:
                parsed.setdefault("red_flags", []).append(f)
        await db.qr_scans.insert_one({"id": str(uuid.uuid4()), "content": data.content[:1000], "result": parsed, "created_at": now_iso()})
        return parsed
    except Exception as e:
        logger.error(f"AI QR error: {e}")
        raise HTTPException(status_code=502, detail="QR analysis failed. Please try again.")


# ---------- admin ----------
@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    users = await db.users.count_documents({})
    reports = await db.reports.count_documents({})
    pending = await db.reports.count_documents({"status": "pending"})
    messages = await db.contact_messages.count_documents({})
    scams = await db.scam_types.count_documents({})
    tips = await db.safety_tips.count_documents({})
    quiz = await db.quiz_questions.count_documents({})
    quiz_taken = await db.quiz_results.count_documents({})
    detections = await db.detections.count_documents({})
    by_category = await db.reports.aggregate([{"$group": {"_id": "$scam_category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(20)
    return {"users": users, "reports": reports, "pending_reports": pending, "messages": messages, "scam_types": scams,
            "safety_tips": tips, "quiz_questions": quiz, "quiz_taken": quiz_taken, "detections": detections,
            "reports_by_category": [{"category": c["_id"] or "Other", "count": c["count"]} for c in by_category]}

def slugify(text: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

@api_router.post("/admin/scam-types")
async def create_scam(data: ScamTypeInput, admin: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    doc["slug"] = doc["slug"] or slugify(doc["title"])
    if await db.scam_types.find_one({"slug": doc["slug"]}):
        doc["slug"] = f"{doc['slug']}-{doc['id'][:6]}"
    await db.scam_types.insert_one({**doc})
    return doc

@api_router.put("/admin/scam-types/{item_id}")
async def update_scam(item_id: str, data: ScamTypeInput, admin: dict = Depends(require_admin)):
    upd = data.model_dump()
    upd["slug"] = upd["slug"] or slugify(upd["title"])
    res = await db.scam_types.update_one({"id": item_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.scam_types.find_one({"id": item_id}, {"_id": 0})

@api_router.delete("/admin/scam-types/{item_id}")
async def delete_scam(item_id: str, admin: dict = Depends(require_admin)):
    res = await db.scam_types.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

@api_router.post("/admin/safety-tips")
async def create_tip(data: SafetyTipInput, admin: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    doc["slug"] = doc["slug"] or slugify(doc["title"])
    await db.safety_tips.insert_one({**doc})
    return doc

@api_router.put("/admin/safety-tips/{item_id}")
async def update_tip(item_id: str, data: SafetyTipInput, admin: dict = Depends(require_admin)):
    upd = data.model_dump()
    upd["slug"] = upd["slug"] or slugify(upd["title"])
    res = await db.safety_tips.update_one({"id": item_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.safety_tips.find_one({"id": item_id}, {"_id": 0})

@api_router.delete("/admin/safety-tips/{item_id}")
async def delete_tip(item_id: str, admin: dict = Depends(require_admin)):
    res = await db.safety_tips.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

@api_router.post("/admin/quiz")
async def create_question(data: QuizQuestionInput, admin: dict = Depends(require_admin)):
    if data.correct_index < 0 or data.correct_index >= len(data.options):
        raise HTTPException(status_code=400, detail="correct_index out of range")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    await db.quiz_questions.insert_one({**doc})
    return doc

@api_router.put("/admin/quiz/{item_id}")
async def update_question(item_id: str, data: QuizQuestionInput, admin: dict = Depends(require_admin)):
    res = await db.quiz_questions.update_one({"id": item_id}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.quiz_questions.find_one({"id": item_id}, {"_id": 0})

@api_router.delete("/admin/quiz/{item_id}")
async def delete_question(item_id: str, admin: dict = Depends(require_admin)):
    res = await db.quiz_questions.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

@api_router.get("/admin/reports")
async def admin_reports(admin: dict = Depends(require_admin)):
    return await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.patch("/admin/reports/{item_id}")
async def update_report_status(item_id: str, body: dict, admin: dict = Depends(require_admin)):
    status = body.get("status")
    if status not in ("pending", "reviewing", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.reports.update_one({"id": item_id}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.get("/admin/contacts")
async def admin_contacts(admin: dict = Depends(require_admin)):
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.patch("/admin/contacts/{item_id}")
async def mark_contact_read(item_id: str, admin: dict = Depends(require_admin)):
    await db.contact_messages.update_one({"id": item_id}, {"$set": {"read": True}})
    return {"message": "Updated"}

@api_router.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)

@api_router.delete("/admin/users/{item_id}")
async def delete_user(item_id: str, admin: dict = Depends(require_admin)):
    if item_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    res = await db.users.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


@api_router.get("/")
async def root():
    return {"message": "SafeNet API is running", "status": "healthy"}


app.include_router(api_router)

# Only origins explicitly listed in CORS_ORIGINS may make credentialed requests.
# Add your production frontend URL (e.g. https://your-app.vercel.app) to CORS_ORIGINS on Render.
_cors_origins = os.environ.get('CORS_ORIGINS', '').strip()
_allowed_origins = [o.strip().rstrip('/') for o in _cors_origins.split(',') if o.strip()] or ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.on_event("startup")
async def seed():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ['ADMIN_EMAIL']
    admin_password = os.environ['ADMIN_PASSWORD']
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"id": str(uuid.uuid4()), "name": "SafeNet Admin", "email": admin_email,
                                   "password_hash": hash_password(admin_password), "role": "admin", "created_at": now_iso()})
        logger.info("Admin account seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.scam_types.count_documents({}) == 0:
        await db.scam_types.insert_many([{"id": str(uuid.uuid4()), **s, "created_at": now_iso()} for s in SCAM_TYPES])
    if await db.safety_tips.count_documents({}) == 0:
        await db.safety_tips.insert_many([{"id": str(uuid.uuid4()), **t, "created_at": now_iso()} for t in SAFETY_TIPS])
    if await db.quiz_questions.count_documents({}) == 0:
        await db.quiz_questions.insert_many([{"id": str(uuid.uuid4()), **q, "created_at": now_iso()} for q in QUIZ_QUESTIONS])
    if await db.blog_posts.count_documents({}) == 0:
        await db.blog_posts.insert_many([{"id": str(uuid.uuid4()), **b, "created_at": now_iso()} for b in BLOG_POSTS])
    logger.info("Seed check complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
