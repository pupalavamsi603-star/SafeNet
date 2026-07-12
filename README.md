# 🛡️ SafeNet — AI-Powered Cyber Safety Platform

A modern, fully responsive full-stack web application for cyber safety awareness and online scam education — powered by Google Gemini AI.

## ✨ Features

- **11 Scam Type Guides** — Phishing, OTP Fraud, UPI Scams, Fake Jobs, Lottery, Investment/Crypto, Tech Support, Social Media, Fake Shopping, QR Code, SIM Swap
- **AI Chatbot (SafeBot)** — Streaming Gemini-powered cybersecurity assistant
- **AI Scam Detector** — Paste any suspicious message → instant risk score, red flags & advice
- **Cyber Safety Quiz** — 15 MCQs with score + downloadable canvas certificate
- **Report a Scam** — Anonymous scam reporting with screenshot upload
- **Blog** — Cyber safety articles
- **Admin Dashboard** — Full CRUD for scam articles, quiz, reports management, user management
- **JWT Auth** — Email/password with httpOnly cookie sessions
- **Dark/Light Mode** — Default dark, toggle in navbar
- **Global Search** — Across scams, tips & blog

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS, shadcn/ui, framer-motion, Recharts |
| Backend | FastAPI (Python), MongoDB (Motor async) |
| Auth | JWT (PyJWT), bcrypt, httpOnly cookies |
| AI | Google Gemini via `emergentintegrations` |
| Icons | lucide-react |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & Yarn
- Python 3.10+
- MongoDB instance (local or Atlas)
- Google Gemini API key

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
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=admin@safenet.com
ADMIN_PASSWORD=YourAdminPassword
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env`)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

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
│   └── package.json
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
