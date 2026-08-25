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

# Cross-site cookies (SameSite=None; Secure) are only needed when the frontend is
# served from another domain over https. Set ENVIRONMENT=production explicitly;
# the CORS_ORIGINS sniff is kept only as a fallback for existing deployments.
IS_PROD = os.environ.get('ENVIRONMENT', '').lower() in ('production', 'prod') or \
    "https://" in os.environ.get('CORS_ORIGINS', '')
COOKIE_KWARGS = {"httponly": True, "secure": IS_PROD, "samesite": "none" if IS_PROD else "lax", "path": "/"}

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, max_age=43200, **COOKIE_KWARGS)
    response.set_cookie("refresh_token", refresh, max_age=604800, **COOKIE_KWARGS)

def clear_auth_cookies(response: Response):
    # Must match the attributes the cookies were set with, or the browser may keep them.
    for name in ("access_token", "refresh_token"):
        response.delete_cookie(name, path="/", secure=IS_PROD, samesite="none" if IS_PROD else "lax", httponly=True)

def _bearer_or_cookie_token(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return token or None

async def get_current_user(request: Request) -> dict:
    token = _bearer_or_cookie_token(request)
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

async def get_optional_user(request: Request) -> Optional[dict]:
    """Resolve the caller for endpoints that also serve guests.

    Used by endpoints that work for guests but must attribute activity to the
    logged-in user when there is one. Never trust a user_id from the request
    body — it is attacker-controlled.

    No credential at all => None (a genuine guest). A credential that is present
    but expired or invalid => 401, so the client refreshes and retries rather
    than being silently downgraded to a guest and then locked out of its own
    chat session.
    """
    if _bearer_or_cookie_token(request) is None:
        return None
    return await get_current_user(request)

def _uid(user: Optional[dict]) -> str:
    return user["id"] if user else ""

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
url_check_limiter = RateLimiter(max_requests=15, window_seconds=60, name="url_check")
# Unauthenticated writes (reports, contact, quiz results) — keeps spam and
# 3MB base64 screenshots from filling the database.
write_limiter = RateLimiter(max_requests=12, window_seconds=60, name="write")

# One shared client: constructing AsyncOpenAI per request builds a new httpx
# connection pool each time and never closes it.
ai_client = openai.AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")


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

# NOTE: user_id is never accepted from the client on any of these models.
# It is derived server-side from the auth cookie (see get_optional_user).
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
    session_id: str = Field(min_length=8, max_length=100)
    message: str = Field(min_length=1, max_length=4000)

class DetectInput(BaseModel):
    message: str = Field(min_length=5, max_length=6000)

class QRScanInput(BaseModel):
    content: str = Field(min_length=1, max_length=6000)

class URLCheckInput(BaseModel):
    url: str = Field(min_length=4, max_length=2000)

class GoogleAuthInput(BaseModel):
    credential: str = Field(min_length=20)

class QuizAnswerInput(BaseModel):
    attempt_id: str = Field(min_length=8, max_length=64)
    question_id: str = Field(min_length=8, max_length=64)
    answer_index: int = Field(ge=0, le=20)

class QuizFinishInput(BaseModel):
    attempt_id: str = Field(min_length=8, max_length=64)


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
    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            resp = await hc.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": data.credential})
    except httpx.HTTPError as e:
        logger.error(f"Google tokeninfo request failed: {e}")
        raise HTTPException(status_code=502, detail="Could not reach Google to verify sign-in. Try again.")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    try:
        info = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Unexpected response from Google. Try again.")
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
    clear_auth_cookies(response)
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

# ---------- quiz ----------
# The quiz is graded server-side. correct_index and explanation are never sent
# to the browser up front, so answers can't be read out of the network tab and
# a score can't simply be POSTed. Each run is an "attempt" the server tallies.

QUIZ_PASS_RATIO = 0.6

@api_router.get("/quiz/questions")
async def quiz_questions(user: dict = Depends(get_current_user), _=Depends(write_limiter)):
    """Start an attempt and return the questions without their answers."""
    questions = await db.quiz_questions.find({}, {"_id": 0}).to_list(50)
    if not questions:
        return {"attempt_id": None, "questions": []}

    attempt = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "question_ids": [q["id"] for q in questions],
        "answers": {},
        "score": 0,
        "finished_at": None,
        "created_at": now_iso(),
    }
    await db.quiz_attempts.insert_one({**attempt})
    return {
        "attempt_id": attempt["id"],
        "questions": [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in questions],
    }

async def _load_attempt(attempt_id: str, uid: str) -> dict:
    attempt = await db.quiz_attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not attempt or attempt.get("user_id") != uid:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    return attempt

@api_router.post("/quiz/answer")
async def quiz_answer(data: QuizAnswerInput, user: dict = Depends(get_current_user)):
    """Grade a single answer, and only then reveal the solution for it."""
    attempt = await _load_attempt(data.attempt_id, user["id"])
    if attempt.get("finished_at"):
        raise HTTPException(status_code=400, detail="This attempt is already finished")
    if data.question_id not in attempt["question_ids"]:
        raise HTTPException(status_code=400, detail="That question is not part of this attempt")
    if data.question_id in attempt.get("answers", {}):
        raise HTTPException(status_code=400, detail="That question was already answered")

    q = await db.quiz_questions.find_one({"id": data.question_id}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if data.answer_index >= len(q["options"]):
        raise HTTPException(status_code=400, detail="Invalid answer")

    correct = data.answer_index == q["correct_index"]
    await db.quiz_attempts.update_one(
        {"id": attempt["id"]},
        {"$set": {f"answers.{data.question_id}": data.answer_index}, "$inc": {"score": 1 if correct else 0}},
    )
    return {
        "correct": correct,
        "correct_index": q["correct_index"],
        "explanation": q.get("explanation", ""),
        "score": attempt["score"] + (1 if correct else 0),
    }

@api_router.post("/quiz/finish")
async def quiz_finish(data: QuizFinishInput, user: dict = Depends(get_current_user)):
    """Close the attempt, record the result, and issue the certificate once."""
    attempt = await _load_attempt(data.attempt_id, user["id"])
    total = len(attempt["question_ids"])

    if not attempt.get("finished_at"):
        await db.quiz_attempts.update_one({"id": attempt["id"]}, {"$set": {"finished_at": now_iso()}})
        await db.quiz_results.insert_one({
            "id": str(uuid.uuid4()), "name": user.get("name", ""), "score": attempt["score"],
            "total": total, "user_id": user["id"], "attempt_id": attempt["id"], "created_at": now_iso(),
        })

    score = attempt["score"]
    passed = total > 0 and (score / total) >= QUIZ_PASS_RATIO
    certificate = await db.certificates.find_one({"user_id": user["id"]}, {"_id": 0})
    newly_issued = False

    # First passing attempt earns the certificate. Later retakes are practice —
    # they never issue a second one or overwrite the original.
    if passed and certificate is None:
        certificate = {
            "id": str(uuid.uuid4()), "user_id": user["id"], "name": user.get("name", ""),
            "score": score, "total": total, "issued_at": now_iso(),
        }
        try:
            await db.certificates.insert_one({**certificate})
            newly_issued = True
        except Exception:
            # unique index race — someone else's request got there first
            certificate = await db.certificates.find_one({"user_id": user["id"]}, {"_id": 0})

    return {
        "score": score, "total": total, "passed": passed,
        "certificate": certificate, "newly_issued": newly_issued,
    }

@api_router.get("/quiz/certificate")
async def quiz_certificate(user: dict = Depends(get_current_user)):
    cert = await db.certificates.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"certificate": cert}

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
    import re
    q = q.strip()[:100]
    if len(q) < 2:
        return {"scams": [], "tips": [], "blog": []}
    # Escape the query: an unescaped user string is a regex the DB will run,
    # so a pattern like (a+)+$ becomes a free CPU-exhaustion attack.
    rx = {"$regex": re.escape(q), "$options": "i"}
    scams = await db.scam_types.find({"$or": [{"title": rx}, {"description": rx}]}, {"_id": 0, "title": 1, "slug": 1, "description": 1}).to_list(5)
    tips = await db.safety_tips.find({"$or": [{"title": rx}, {"summary": rx}]}, {"_id": 0, "title": 1, "slug": 1, "summary": 1}).to_list(5)
    blog = await db.blog_posts.find({"$or": [{"title": rx}, {"excerpt": rx}]}, {"_id": 0, "title": 1, "slug": 1, "excerpt": 1}).to_list(5)
    return {"scams": scams, "tips": tips, "blog": blog}

@api_router.post("/reports")
async def create_report(data: ReportInput, user: Optional[dict] = Depends(get_optional_user), _=Depends(write_limiter)):
    if data.screenshot and len(data.screenshot) > 3_000_000:
        raise HTTPException(status_code=400, detail="Screenshot too large (max ~2MB)")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "user_id": _uid(user), "status": "pending", "created_at": now_iso()}
    await db.reports.insert_one({**doc})
    doc.pop("screenshot", None)
    return doc

@api_router.post("/contact")
async def create_contact(data: ContactInput, _=Depends(write_limiter)):
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

async def assert_session_access(session_id: str, uid: str):
    """A chat session belongs to whoever created it.

    Sessions started while logged in are readable only by that account. Sessions
    started as a guest carry no identity, so they stay open to guests — the id is
    random and nothing in them is tied to a person.
    """
    first = await db.chat_messages.find_one(
        {"session_id": session_id}, {"_id": 0, "user_id": 1}, sort=[("created_at", 1)]
    )
    if first is None:
        return  # brand-new session, the caller claims it
    if (first.get("user_id") or "") != uid:
        raise HTTPException(status_code=403, detail="This conversation belongs to another account")

@api_router.post("/ai/chat")
async def ai_chat(data: ChatInput, user: Optional[dict] = Depends(get_optional_user), _=Depends(ai_chat_limiter)):
    uid = _uid(user)
    await assert_session_access(data.session_id, uid)
    history = await db.chat_messages.find({"session_id": data.session_id}, {"_id": 0}).sort("created_at", -1).to_list(10)
    history.reverse()
    context = ""
    if history:
        context = "Previous conversation:\n" + "\n".join(f"{m['role']}: {m['content'][:500]}" for m in history) + "\n\nUser's new message: "
    await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "session_id": data.session_id, "user_id": uid, "role": "user", "content": data.message, "created_at": now_iso()})

    async def gen():
        full = ""
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
            await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "session_id": data.session_id, "user_id": uid, "role": "assistant", "content": full, "created_at": now_iso()})

    return StreamingResponse(gen(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api_router.get("/ai/chat/{session_id}/history")
async def chat_history(session_id: str, user: Optional[dict] = Depends(get_optional_user)):
    await assert_session_access(session_id, _uid(user))
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return msgs

@api_router.post("/ai/detect")
async def ai_detect(data: DetectInput, user: Optional[dict] = Depends(get_optional_user), _=Depends(ai_detect_limiter)):
    import json as jsonlib
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
        await db.detections.insert_one({"id": str(uuid.uuid4()), "message": data.message[:1000], "user_id": _uid(user), "result": parsed, "created_at": now_iso()})
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

# Single source of truth — the QR and URL checkers previously kept two
# near-identical copies of these, which drifted apart.
URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly",
    "shorturl.at", "rb.gy", "tiny.cc", "s.id", "v.gd", "ow.ly", "cli.gs", "url.ie", "tr.im",
}
SUSPICIOUS_TLDS = {
    ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".buzz", ".club", ".work", ".zip",
    ".icu", ".review", ".date", ".loan", ".download", ".men", ".win", ".bid",
}

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
async def ai_qr(data: QRScanInput, user: Optional[dict] = Depends(get_optional_user), _=Depends(ai_qr_limiter)):
    import json as jsonlib
    local_flags = qr_heuristics(data.content)
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
        await db.qr_scans.insert_one({"id": str(uuid.uuid4()), "content": data.content[:1000], "user_id": _uid(user), "result": parsed, "created_at": now_iso()})
        return parsed
    except Exception as e:
        logger.error(f"AI QR error: {e}")
        raise HTTPException(status_code=502, detail="QR analysis failed. Please try again.")


# ---------- URL check ----------

def url_heuristics(url: str) -> list:
    import re
    flags = []
    u = url.strip().lower()
    if not u.startswith("https://") and not u.startswith("http://"):
        u = "http://" + u
    if u.startswith("http://"):
        flags.append("Uses insecure HTTP instead of encrypted HTTPS")
    m = re.search(r"https?://([^/\s:?]+)", u)
    if m:
        host = m.group(1)
        if host in URL_SHORTENERS or any(host.endswith("." + s) for s in URL_SHORTENERS):
            flags.append(f"Shortened URL ({host}) hides the real destination")
        if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}(:\d+)?", host):
            flags.append("Links directly to a raw IP address — unusual for legitimate sites")
        if "xn--" in host:
            flags.append("Punycode domain — may impersonate a trusted site with lookalike characters")
        for tld in SUSPICIOUS_TLDS:
            if host.endswith(tld):
                flags.append(f"Domain uses {tld} — a TLD commonly abused by scammers")
                break
        if re.search(r"\.(apk|exe|msi|bat|scr|zip|rar)($|\?)", u):
            flags.append("Direct download link for executables — common malware delivery method")
        # Score the leftmost label. Previously this only ran when the host had
        # more than one dot, so two-label phishing domains (secure-login-paypal.tk)
        # were never checked at all.
        subdomain = host.rstrip("/").split(".")[0]
        BENIGN_LABELS = (
            "www", "mail", "m", "shop", "blog", "app", "apps", "api", "docs", "help", "support",
            "login", "account", "accounts", "secure", "web", "beta", "portal", "signin", "auth",
            "id", "my", "store", "news", "developer", "developers", "cloud", "console", "admin",
        )
        if subdomain and subdomain not in BENIGN_LABELS:
            score = 0
            for kw in ("secure", "login", "account", "bank", "verify", "update", "confirm", "paypal", "apple", "google", "microsoft", "amazon", "netflix", "insta", "faceboo", "whatsapp", "telegram", "signin", "2fa", "auth", "wallet", "refund", "claim", "prize", "won", "free", "gift", "bonus", "reward", "cash", "lottery", "crypto", "bitcoin"):
                if kw in subdomain or kw in host:
                    score += 1
            if score >= 2:
                flags.append(f"Suspicious domain name ({host}) — mimics a real brand or service")
    return flags

URL_CHECK_SYSTEM = (
    "You are a URL safety analysis engine. A user submits a URL, and you assess whether it is safe or a phishing/scam link. "
    "Consider: suspicious domain patterns, typosquatting (e.g., go0gle, faceboook), lookalike TLDs (.com vs .co, .org vs .net variants), "
    "excessive subdomains, long query parameters hiding malicious payload, known phishing keywords in the path. "
    "Respond ONLY with valid JSON, no markdown fences, in this exact schema: "
    '{"risk_level": "safe" | "suspicious" | "dangerous", "risk_score": <0-100 integer>, '
    '"scam_type": "<short label or None detected>", "red_flags": ["<flag1>", "<flag2>"], '
    '"explanation": "<2-3 sentence plain-language explanation>", "advice": ["<action1>", "<action2>", "<action3>"]}'
)

@api_router.post("/ai/url-check")
async def ai_url_check(data: URLCheckInput, _=Depends(url_check_limiter)):
    import json as jsonlib
    local_flags = url_heuristics(data.url)
    try:
        hint = ("\n\nLocal checks already flagged: " + "; ".join(local_flags)) if local_flags else ""
        messages = [
            {"role": "system", "content": URL_CHECK_SYSTEM},
            {"role": "user", "content": f"Analyze this URL for scam indicators:\n\n{data.url}{hint}"},
        ]
        response = await ai_client.chat.completions.create(model=OPENROUTER_MODEL, messages=messages)
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = jsonlib.loads(text.strip())
        existing = {f.lower() for f in parsed.get("red_flags", [])}
        for f in local_flags:
            if f.lower() not in existing:
                parsed.setdefault("red_flags", []).append(f)
        return parsed
    except Exception as e:
        logger.error(f"AI URL check error: {e}")
        raise HTTPException(status_code=502, detail="URL check failed. Please try again.")


# ---------- user dashboard ----------

@api_router.get("/user/stats")
async def user_stats(user: dict = Depends(get_current_user)):
    uid = user["id"]
    detections = await db.detections.count_documents({"user_id": uid})
    quizzes = await db.quiz_results.count_documents({"user_id": uid})
    reports = await db.reports.count_documents({"user_id": uid})
    qr_scans = await db.qr_scans.count_documents({"user_id": uid})
    chats = len(await db.chat_messages.distinct("session_id", {"user_id": uid}))
    return {
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "member_since": user.get("created_at", ""),
        "detections": detections,
        "quizzes": quizzes,
        "reports": reports,
        "qr_scans": qr_scans,
        "chat_sessions": chats,
        "total_activity": detections + quizzes + reports + qr_scans,
    }

@api_router.get("/user/activity")
async def user_activity(user: dict = Depends(get_current_user)):
    uid = user["id"]
    activities = []
    async for d in db.detections.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(10):
        risk = d.get("result", {}).get("risk_level", "")
        activities.append({"type": "detect", "title": f"Scam detection — {risk}", "subtitle": risk, "timestamp": d["created_at"], "id": d["id"]})
    async for r in db.reports.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(10):
        activities.append({"type": "report", "title": f"Report filed — {r.get('scam_category', 'Other')}", "subtitle": r.get("status", ""), "timestamp": r["created_at"], "id": r["id"]})
    async for q in db.quiz_results.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(10):
        activities.append({"type": "quiz", "title": f"Quiz: {q.get('score', 0)}/{q.get('total', 0)}", "subtitle": f"{q.get('score', 0)}/{q.get('total', 0)}", "timestamp": q["created_at"], "id": q["id"]})
    async for s in db.qr_scans.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(10):
        risk = s.get("result", {}).get("risk_level", "")
        activities.append({"type": "qr", "title": f"QR scan — {risk}", "subtitle": risk, "timestamp": s["created_at"], "id": s["id"]})
    activities.sort(key=lambda a: a["timestamp"], reverse=True)
    return activities[:20]

@api_router.get("/user/chat-sessions")
async def user_chat_sessions(user: dict = Depends(get_current_user)):
    uid = user["id"]
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$session_id", "session_id": {"$first": "$session_id"}, "last_message": {"$first": "$content"}, "updated_at": {"$first": "$created_at"}, "message_count": {"$sum": 1}}},
        {"$sort": {"updated_at": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "session_id": 1, "last_message": 1, "message_count": 1, "updated_at": 1}},
    ]
    sessions = await db.chat_messages.aggregate(pipeline).to_list(10)
    return sessions


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
    if await db.safety_tips.find_one({"slug": doc["slug"]}):
        doc["slug"] = f"{doc['slug']}-{doc['id'][:6]}"
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

@api_router.get("/admin/quiz")
async def admin_quiz_questions(admin: dict = Depends(require_admin)):
    """Full questions, answers included — the public endpoint no longer exposes them."""
    return await db.quiz_questions.find({}, {"_id": 0}).to_list(200)

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

# Vercel generates a different *.vercel.app URL for every branch/preview deployment
# (e.g. safe-net-git-main-vamsi13.vercel.app, safe-6kge5vkpk-vamsi13.vercel.app).
# Exact-matching CORS_ORIGINS breaks every time that URL changes, so also allow any
# deployment URL under this Vercel project/team via regex, in addition to the
# explicit list above (custom domains, localhost, etc.).
_vercel_origin_regex = r"^https://safe(-[a-z0-9]+)*-vamsi13\.vercel\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_vercel_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.on_event("startup")
async def seed():
    await db.users.create_index("email", unique=True)
    # One certificate per user — enforced here so a race can't mint two.
    await db.certificates.create_index("user_id", unique=True)
    await db.quiz_attempts.create_index("user_id")
    admin_email = os.environ['ADMIN_EMAIL']
    admin_password = os.environ['ADMIN_PASSWORD']
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"id": str(uuid.uuid4()), "name": "SafeNet Admin", "email": admin_email,
                                   "password_hash": hash_password(admin_password), "role": "admin", "created_at": now_iso()})
        logger.info("Admin account seeded")
    else:
        # An account on this email may have been created via Google sign-in, in
        # which case it has no password_hash at all — don't assume the key exists.
        current_hash = existing.get("password_hash")
        updates = {}
        if not current_hash or not verify_password(admin_password, current_hash):
            updates["password_hash"] = hash_password(admin_password)
        if existing.get("role") != "admin":
            updates["role"] = "admin"
        if updates:
            await db.users.update_one({"email": admin_email}, {"$set": updates})
            logger.info("Admin account reconciled")

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
