# SafeNet – Cyber Safety Tips & Online Scam Awareness Platform

## Original Problem Statement
Build a modern, fully responsive AI-powered cyber safety website "SafeNet" with: Home, About, Cyber Safety Tips, Online Scam Types (11 categories), AI Scam Detection & Chatbot, Cyber Safety Quiz with certificate, Report a Scam, Blog, Contact, Login/Register (JWT), Admin Dashboard. Theme: Dark Blue #0F172A, Sky Blue #3B82F6, Red alerts. Stack: React + Tailwind, FastAPI, MongoDB, AI via Gemini (user's own key), Lucide icons, dark/light mode, search, FAQ.

## User Choices
- Full-stack React + FastAPI + MongoDB
- AI: user's own Gemini API key via `google-genai` SDK (gemini-2.0-flash, fallback gemini-1.5-flash; originally emergentintegrations, swapped for deployment)
- JWT-based email/password auth (httpOnly cookies)
- Full scope MVP approved; multi-language & PDF guides deferred

## Architecture
- Backend: `/app/backend/server.py` (FastAPI, all routes prefixed /api), `seed_data.py` (11 scams, 10 tips, 15 quiz Qs, 5 blog posts, auto-seeded on startup)
- Auth: bcrypt + PyJWT, httpOnly cookies (access 12h / refresh 7d), admin seeded from .env
- AI: POST /api/ai/chat (streamed plain-text), POST /api/ai/detect (JSON risk verdict), chat history persisted per session in `chat_messages`
- DB collections: users, scam_types, safety_tips, quiz_questions, quiz_results, reports, contact_messages, blog_posts, chat_messages, detections
- Frontend: React 19 + shadcn + framer-motion + recharts; pages in `src/pages/`, admin in `src/pages/admin/`; ThemeContext (dark default) + AuthContext; fonts Unbounded + IBM Plex Sans

## Implemented (June 2026 – MVP complete, tested iteration_1: pass)
- Home (hero + 3 CTAs, animated shield illustration, stats, bento features, alert banner, FAQ accordion)
- Scam Types list + detail pages (description / how it works / warning signs / prevention / real example)
- Safety Tips (10 topics with checklists)
- AI Chatbot (streaming, suggestions, persisted history) + AI Scam Detector (risk score, red flags, advice)
- Quiz: 15 MCQs, instant explanations, score, canvas certificate (name + PNG download, pass ≥60%)
- Report Scam (category, description, phone/URL, base64 screenshot ≤2MB, emergency steps panel)
- Blog list + article pages (5 seeded posts)
- Contact form; global search dialog (scams/tips/blog); dark/light toggle
- JWT auth: register/login/logout/me; admin role; ProtectedRoute
- Admin Dashboard: Overview (stat cards + reports-by-category bar chart), Scam Articles CRUD, Quiz CRUD, Reports (status workflow + detail w/ screenshot), Contact Messages (mark read), Users (list/delete)

## Credentials
- Admin: seeded on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` (never commit real values — .env is gitignored)

## Hardening (July 2026)
- CORS locked to explicit `CORS_ORIGINS` allowlist via starlette CORSMiddleware (vercel.app wildcard removed); preflight from disallowed origins properly rejected
- `/api/auth/refresh` endpoint added (rotates both tokens); frontend axios interceptor silently refreshes on 401 and retries — sessions now last up to 7 days
- Rate limiting: sliding-window per-IP limiter — /ai/chat 20/min, /ai/detect 10/min, auth endpoints 10/min (basic brute-force protection); 429 + Retry-After, with countdown cooldown UI in chat & detector
- Plaintext admin credentials scrubbed from repo (PRD, auth_testing.md, backend_test.py, test_reports); tests read ADMIN_EMAIL/ADMIN_PASSWORD from env

## Backlog (prioritized)
- P1: Blog post CRUD in admin; Safety Tips CRUD UI in admin (API already exists)
- P2: Multi-language support; downloadable PDF safety guides; forgot/reset password flow
- P2: SEO meta tags per page; suppress /auth/me 401 console noise; DialogDescription for Radix a11y warnings
- P2: Deployment (in progress — Render backend + Vercel frontend)

## Next Tasks
1. Gather user feedback on MVP
2. P1 items above
