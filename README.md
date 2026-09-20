# 🛡️ SafeNet — AI-Powered Cyber Safety Platform

A responsive AI-powered cybersecurity platform with URL checks, QR scanning, message analysis and a cybersecurity assistant, powered by OpenRouter.

## ✨ Features

- **11 Scam Type Guides** — Phishing, OTP Fraud, UPI Scams, Fake Jobs, Lottery, Investment/Crypto, Tech Support, Social Media, Fake Shopping, QR Code, SIM Swap
- **Homepage Security Workspace** — Scan URL, Scan QR Code, Scan Text / Message and Ask AI, sharing the existing tools with `/ai`
- **URL & QR Analysis** — AI risk assessment and URL heuristics; QR uploads and camera decoding use html5-qrcode
- **AI Chatbot (SafeBot)** — Streaming OpenRouter-powered cybersecurity assistant
- **AI Scam Detector** — Paste any suspicious message → instant risk score, red flags & advice
- **Cyber Safety Quiz** — 15 MCQs with score + downloadable canvas certificate
- **Report a Scam** — Anonymous scam reporting with screenshot upload
- **Blog** — Cyber safety articles
- **Admin Dashboard** — Full CRUD for scam articles, quiz, reports management, user management
- **JWT Auth** — Email/password with httpOnly cookie sessions, silent refresh (7-day sessions)
- **Rate Limiting** — Per-IP limits on AI & auth endpoints with friendly cooldown UI
- **Dark/Light Mode** — Default light, saved preferences and navbar toggle preserved
- **Global Search** — Across scams, tips & blog

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS, shadcn/ui, framer-motion, Recharts |
| Backend | FastAPI (Python), MongoDB (Motor async) |
| Auth | JWT (PyJWT), bcrypt, httpOnly cookies |
| AI | OpenRouter via OpenAI Python SDK (`OPENROUTER_MODEL`, default `openai/gpt-4o-mini`) |
| Icons | lucide-react |

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ & Yarn
- Python 3.10+
- MongoDB instance (local or Atlas)
- OpenRouter API key

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see `.env.example`):

```bash
cp .env.example .env
# Fill in your values
```

Run the server:
```bash
uvicorn server:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
yarn install
```

Create a `.env` file in `frontend/` (see `.env.example`):

```bash
cp .env.example .env
# Fill in your values
```

Run the dev server:
```bash
yarn start
```

## 🔐 Environment Variables

### Backend (`backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=safenet
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=admin@safenet.com
ADMIN_PASSWORD=YourAdminPassword
# Comma-separated list of allowed frontend origins.
# Only these origins can make credentialed API requests (add your production URL when deploying).
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env`)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 📱 Android App

The same frontend ships as an Android APK via Capacitor:

```bash
cd frontend
yarn apk
```

See **[MOBILE.md](MOBILE.md)** for the backend URL setup, signing, and how auth differs
on mobile (bearer tokens instead of cookies).

## 📁 Project Structure

```
SafeNet/
├── backend/
│   ├── server.py        # FastAPI app — all routes, auth, AI, admin
│   ├── seed_data.py     # Initial data (11 scams, 10 tips, 15 quiz Qs, 5 blog posts)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/       # 12 pages + admin dashboard
│   │   ├── components/  # Navbar, Footer + shadcn/ui components
│   │   ├── context/     # AuthContext + ThemeContext
│   │   └── lib/         # API client (axios)
│   ├── android/         # Capacitor Android project (APK build)
│   ├── scripts/build-apk.js
│   └── package.json
├── MOBILE.md            # Android build & release guide
└── memory/
    └── PRD.md           # Product requirements document
```

## 🧪 Running Tests

```bash
# Backend tests
cd backend
pytest tests/backend_test.py -v
```

## 📝 License

MIT

## Validation and deployment

Run `yarn lint`, `yarn test --watchAll=false --runInBand`, and `yarn build` in `frontend`.
Lint covers the security workspace and the shared files changed by this restructure.
This project uses JavaScript, so there is no TypeScript type-check command.

Install `backend/requirements-dev.txt` as well as the runtime requirements for backend tests.
Export `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your backend environment before running pytest.
Tests target `http://localhost:8000` unless `REACT_APP_BACKEND_URL` is set.
Start the backend with a separate `DB_NAME` for tests: the suite creates users, reports,
chat history and temporary admin content. Do not run mutation tests against production data.

On Vercel, set `REACT_APP_BACKEND_URL` to the HTTPS origin of the deployed backend before building.
If omitted, requests use same-origin `/api`, which requires a reverse proxy to FastAPI.
The existing Vercel SPA rewrite does not supply that proxy, so Vercel needs the explicit backend URL.
Render uses `render.yaml`; configure the MongoDB, JWT, admin, OpenRouter and CORS variables there.
Use `ENVIRONMENT=production` for secure cross-site auth cookies. Google sign-in additionally
uses matching `GOOGLE_CLIENT_ID` and `REACT_APP_GOOGLE_CLIENT_ID` values.
Only public origins and OAuth client IDs belong in frontend variables. AI keys stay server-side.

See [the implementation and verification record](test_reports/homepage-restructure.md) for the feature map and test results.


### Phone-to-desktop QR scanning

Desktop QR tools create a temporary pairing QR linking to `/qr/phone/:id` on the current frontend origin (or optional `REACT_APP_PUBLIC_URL`). Open it with your phone's normal camera, then choose **Scan QR with camera** in the mobile browser. Decoded content travels over authenticated short-interval HTTPS polling to the original desktop, which calls the existing `/api/ai/qr` endpoint and renders its normal result. Image upload, drag/drop and desktop camera scanning remain available; narrow screens prioritize camera scanning.

Pairing expires after five minutes. Desktop and phone credentials are separate, unguessable capabilities; phone tokens travel in the pairing URL fragment and polling credentials in POST bodies. The first phone claims the session with a per-tab device credential. Sessions and decoded content live only in backend memory and are removed on completion, cancellation or expiry. The existing QR analysis endpoint retains its existing scan-history behavior. Keep pairing links private.

The configured Render service runs one Uvicorn worker. Realtime pairing deliberately uses that existing single process and needs no additional database or infrastructure. A backend restart invalidates open sessions; start a new scan. If the service is later scaled to multiple workers/instances, session relay must move to a shared store/pub-sub. HTTPS and a permitted frontend `CORS_ORIGINS` origin are required in production; no WebSocket upgrade or persistent connection is required.
