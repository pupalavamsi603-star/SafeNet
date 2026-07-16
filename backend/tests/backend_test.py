"""
SafeNet Backend API Tests
Covers: auth, public content, reports, contact, search, AI, admin CRUD & role checks.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://protect-online-6.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Admin credentials come from the environment — never hardcode them here.
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@safenet.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
if not ADMIN_PASSWORD:
    pytest.skip("Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) env vars to run these tests", allow_module_level=True)


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def user_session():
    s = requests.Session()
    email = f"testuser_{uuid.uuid4().hex[:8]}@safenet.com"
    r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "User@1234"}, timeout=15)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    return s, email


# ---------- health ----------
class TestHealth:
    def test_api_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"


# ---------- auth ----------
class TestAuth:
    def test_admin_login_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        # cookie should exist
        assert "access_token" in s.cookies, f"cookies: {s.cookies}"

    def test_admin_login_invalid_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"}, timeout=15)
        assert r.status_code == 401

    def test_register_and_me(self):
        s = requests.Session()
        email = f"user_{uuid.uuid4().hex[:8]}@safenet.com"
        r = s.post(f"{API}/auth/register", json={"name": "Alice", "email": email, "password": "User@1234"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == email
        # /me
        r2 = s.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["email"] == email
        # no password_hash exposed
        assert "password_hash" not in r2.json()

    def test_register_duplicate_email(self, user_session):
        _, email = user_session
        r = requests.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "User@1234"}, timeout=15)
        assert r.status_code == 400

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200


# ---------- public content ----------
class TestPublicContent:
    def test_scam_types_count(self):
        r = requests.get(f"{API}/scam-types", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 11, f"Expected 11 scams, got {len(data)}"
        assert "slug" in data[0]

    def test_scam_detail_by_slug(self):
        listing = requests.get(f"{API}/scam-types", timeout=10).json()
        slug = listing[0]["slug"]
        r = requests.get(f"{API}/scam-types/{slug}", timeout=10)
        assert r.status_code == 200
        assert r.json()["slug"] == slug

    def test_scam_detail_404(self):
        r = requests.get(f"{API}/scam-types/nonexistent-slug-xyz", timeout=10)
        assert r.status_code == 404

    def test_safety_tips_count(self):
        r = requests.get(f"{API}/safety-tips", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) == 10

    def test_quiz_questions_count(self):
        r = requests.get(f"{API}/quiz/questions", timeout=10)
        assert r.status_code == 200
        qs = r.json()
        assert len(qs) == 15
        assert "correct_index" in qs[0]

    def test_blog_count(self):
        r = requests.get(f"{API}/blog", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_blog_detail(self):
        listing = requests.get(f"{API}/blog", timeout=10).json()
        slug = listing[0]["slug"]
        r = requests.get(f"{API}/blog/{slug}", timeout=10)
        assert r.status_code == 200
        assert "content" in r.json()

    def test_search(self):
        r = requests.get(f"{API}/search", params={"q": "phishing"}, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "scams" in data and "tips" in data and "blog" in data


# ---------- reports / contact ----------
class TestReports:
    def test_create_report(self):
        payload = {
            "scam_category": "Phishing",
            "description": "TEST_ Received a fake SBI email asking for OTP.",
            "reporter_email": "TEST_reporter@example.com"
        }
        r = requests.post(f"{API}/reports", json=payload, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"
        assert data["scam_category"] == "Phishing"
        assert "id" in data

    def test_report_validation_short_description(self):
        r = requests.post(f"{API}/reports", json={"scam_category": "X", "description": "hi"}, timeout=10)
        assert r.status_code == 422


class TestContact:
    def test_contact_success(self):
        payload = {"name": "TEST User", "email": "TEST_contact@example.com",
                   "subject": "Hello", "message": "This is a test message."}
        r = requests.post(f"{API}/contact", json=payload, timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == payload["email"]

    def test_contact_bad_email(self):
        payload = {"name": "X", "email": "not-an-email", "subject": "Hi", "message": "hello"}
        r = requests.post(f"{API}/contact", json=payload, timeout=10)
        assert r.status_code == 422


# ---------- AI ----------
class TestAI:
    def test_detect_scam(self):
        payload = {"message": "You won 25 lakh in KBC lottery! Pay Rs 5000 fee to claim your prize immediately."}
        r = requests.post(f"{API}/ai/detect", json=payload, timeout=60)
        if r.status_code == 502:
            pytest.skip(f"Gemini API upstream error: {r.text}")
        assert r.status_code == 200
        data = r.json()
        assert data["risk_level"] in ("safe", "suspicious", "dangerous")
        assert isinstance(data["risk_score"], int)
        assert 0 <= data["risk_score"] <= 100
        assert isinstance(data["red_flags"], list)
        assert isinstance(data["advice"], list)

    def test_chat_streaming(self):
        session_id = f"test-{uuid.uuid4().hex[:8]}"
        payload = {"session_id": session_id, "message": "What is phishing? Answer in one short sentence."}
        r = requests.post(f"{API}/ai/chat", json=payload, timeout=60, stream=True)
        assert r.status_code == 200
        assert "text/plain" in r.headers.get("Content-Type", "")
        chunks = []
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                chunks.append(chunk)
            if sum(len(c) for c in chunks) > 20:
                break
        r.close()
        full = "".join(chunks)
        assert len(full) > 0, "No streaming content received"


# ---------- admin auth & role checks ----------
class TestAdminAuth:
    def test_admin_stats_requires_auth(self):
        r = requests.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 401

    def test_admin_stats_forbidden_for_user(self, user_session):
        s, _ = user_session
        r = s.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 403

    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ("users", "reports", "scam_types", "safety_tips", "quiz_questions", "reports_by_category"):
            assert k in data
        assert data["scam_types"] == 11
        assert data["safety_tips"] == 10
        assert data["quiz_questions"] == 15


# ---------- admin CRUD ----------
class TestAdminCRUD:
    def test_scam_crud(self, admin_session):
        payload = {
            "title": "TEST_ScamType_" + uuid.uuid4().hex[:6],
            "description": "test description for scam",
            "how_it_works": "test how it works",
            "warning_signs": ["a", "b"],
            "prevention_tips": ["x"],
        }
        # create
        r = admin_session.post(f"{API}/admin/scam-types", json=payload, timeout=10)
        assert r.status_code == 200
        item = r.json()
        assert item["title"] == payload["title"]
        assert item["slug"]
        item_id = item["id"]
        # update
        payload2 = {**payload, "description": "updated desc"}
        r = admin_session.put(f"{API}/admin/scam-types/{item_id}", json=payload2, timeout=10)
        assert r.status_code == 200
        assert r.json()["description"] == "updated desc"
        # delete
        r = admin_session.delete(f"{API}/admin/scam-types/{item_id}", timeout=10)
        assert r.status_code == 200

    def test_quiz_crud(self, admin_session):
        payload = {
            "question": "TEST_ Which is a phishing sign?",
            "options": ["Urgent tone", "Blue text", "Uses HTTPS", "None"],
            "correct_index": 0,
            "explanation": "urgency is a red flag"
        }
        r = admin_session.post(f"{API}/admin/quiz", json=payload, timeout=10)
        assert r.status_code == 200
        item_id = r.json()["id"]
        # bad index
        bad = {**payload, "correct_index": 10}
        r = admin_session.post(f"{API}/admin/quiz", json=bad, timeout=10)
        assert r.status_code == 400
        # delete
        r = admin_session.delete(f"{API}/admin/quiz/{item_id}", timeout=10)
        assert r.status_code == 200

    def test_admin_reports_list_and_status_update(self, admin_session):
        # create one
        rep = requests.post(f"{API}/reports", json={
            "scam_category": "OTP Fraud",
            "description": "TEST_ status test report description here."
        }, timeout=10).json()
        # list
        r = admin_session.get(f"{API}/admin/reports", timeout=10)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert rep["id"] in ids
        # update status
        r = admin_session.patch(f"{API}/admin/reports/{rep['id']}", json={"status": "reviewing"}, timeout=10)
        assert r.status_code == 200
        # invalid status
        r = admin_session.patch(f"{API}/admin/reports/{rep['id']}", json={"status": "bogus"}, timeout=10)
        assert r.status_code == 400

    def test_admin_contacts_and_mark_read(self, admin_session):
        c = requests.post(f"{API}/contact", json={"name": "TEST", "email": "TEST_c2@example.com",
                                                  "subject": "hi", "message": "test message body"}, timeout=10).json()
        r = admin_session.get(f"{API}/admin/contacts", timeout=10)
        assert r.status_code == 200
        r = admin_session.patch(f"{API}/admin/contacts/{c['id']}", timeout=10)
        assert r.status_code == 200

    def test_admin_users_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        # no password_hash
        for u in users:
            assert "password_hash" not in u
