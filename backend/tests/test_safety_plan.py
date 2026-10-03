from types import SimpleNamespace

from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

import server


class FakeUsers:
    def __init__(self):
        self.documents = {"alice": {"id": "alice"}, "bob": {"id": "bob"}}

    async def find_one(self, query, projection=None):
        return self.documents.get(query.get("id"))

    async def update_one(self, query, update):
        document = self.documents.get(query.get("id"))
        if not document:
            return SimpleNamespace(matched_count=0)
        for key, value in update["$set"].items():
            parent, child = key.split(".")
            document.setdefault(parent, {})[child] = value
        return SimpleNamespace(matched_count=1)


def test_safety_plan_is_private_and_validated(monkeypatch):
    users = FakeUsers()
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users))
    app = FastAPI()
    app.include_router(server.api_router)

    async def signed_in(request: Request):
        user_id = request.headers.get("x-test-user")
        if not user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"id": user_id}

    app.dependency_overrides[server.get_current_user] = signed_in

    with TestClient(app) as client:
        assert client.get("/api/user/safety-plan").status_code == 401
        assert client.patch("/api/user/safety-plan", headers={"x-test-user": "alice"}, json={"step": "admin", "completed": True}).status_code == 422

        alice = {"x-test-user": "alice"}
        bob = {"x-test-user": "bob"}
        initial = client.get("/api/user/safety-plan", headers=alice).json()
        assert initial == {"steps": {key: False for key in server.SAFETY_PLAN_STEPS}, "completed_count": 0, "total": 4}

        updated = client.patch("/api/user/safety-plan", headers=alice, json={"step": "mfa", "completed": True}).json()
        assert updated["steps"]["mfa"] is True
        assert updated["completed_count"] == 1
        assert client.get("/api/user/safety-plan", headers=bob).json()["completed_count"] == 0

        undone = client.patch("/api/user/safety-plan", headers=alice, json={"step": "mfa", "completed": False}).json()
        assert undone["completed_count"] == 0
