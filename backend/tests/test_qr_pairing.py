import time
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
import qr_pairing as pairing

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    app = FastAPI()
    app.include_router(pairing.router)
    pairing.creation_times.clear()
    with TestClient(app) as client:
        yield client
    pairing.sessions.clear()

def create(client):
    response = client.post("/api/qr-pair")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    return response.json()

def auth(ws, session, role, device="test-phone-device-123456789"):
    ws.send_json({"role": role, "token": session[role + "_token"], "device": device})

def test_relay_completion_and_cleanup(client):
    session = create(client)
    with client.websocket_connect('/api/qr-pair/' + session['id']) as desktop:
        auth(desktop, session, 'desktop')
        assert desktop.receive_json()['state'] == 'waiting'
        desktop.receive_json()
        with client.websocket_connect('/api/qr-pair/' + session['id']) as phone:
            auth(phone, session, 'phone')
            assert phone.receive_json()['state'] == 'connected'
            assert desktop.receive_json()['state'] == 'connected'
            phone.send_json({'type': 'ready'})
            assert desktop.receive_json()['state'] == 'ready'
            assert phone.receive_json()['state'] == 'ready'
            phone.send_json({'type': 'scan', 'content': 'https://example.com'})
            assert phone.receive_json()['state'] == 'detected'
            assert desktop.receive_json() == {'state': 'detected', 'content': 'https://example.com'}
            desktop.send_json({'type': 'analyzing'})
            assert phone.receive_json()['state'] == 'analyzing'
            desktop.send_json({'type': 'complete'})
            assert phone.receive_json()['state'] == 'complete'
            assert desktop.receive_json()['state'] == 'complete'
            time.sleep(.02)
            assert session['id'] not in pairing.sessions

def test_cross_session_and_role_access_rejected(client):
    a, b = create(client), create(client)
    for token, role in [(a['phone_token'], 'desktop'), (b['phone_token'], 'phone')]:
        with client.websocket_connect('/api/qr-pair/' + a['id']) as ws:
            ws.send_json({'role': role, 'token': token, 'device': 'test-device-1234567890'})
            with pytest.raises(WebSocketDisconnect) as error:
                ws.receive_json()
            assert error.value.code == 1008

def test_invalid_and_expired_sessions(client, monkeypatch):
    with client.websocket_connect('/api/qr-pair/missing') as ws:
        ws.send_json({'role': 'phone', 'token': 'unknown'})
        assert ws.receive_json()['state'] == 'expired'
    monkeypatch.setattr(pairing, 'TTL', .05)
    session = create(client)
    with client.websocket_connect('/api/qr-pair/' + session['id']) as ws:
        auth(ws, session, 'desktop')
        ws.receive_json(); ws.receive_json()
        assert ws.receive_json()['state'] == 'expired'
        assert session['id'] not in pairing.sessions

def test_phone_claim_and_validation(client):
    session = create(client)
    with client.websocket_connect('/api/qr-pair/' + session['id']) as phone:
        auth(phone, session, 'phone')
        phone.receive_json()
        phone.send_json({'type': 'scan', 'content': 'x' * 6001})
        assert phone.receive_json()['state'] == 'invalid'
    time.sleep(.02)
    with client.websocket_connect('/api/qr-pair/' + session['id']) as intruder:
        auth(intruder, session, 'phone', 'another-device-1234567890')
        with pytest.raises(WebSocketDisconnect): intruder.receive_json()
    with client.websocket_connect('/api/qr-pair/' + session['id']) as phone:
        auth(phone, session, 'phone')
        assert phone.receive_json()['state'] == 'connected'

def test_origin_and_creation_rate_limit(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect('/api/qr-pair/missing', headers={'origin': 'https://untrusted.example'}): pass
    for _ in range(20): create(client)
    assert client.post('/api/qr-pair').status_code == 429


def test_buffered_scan_survives_desktop_reconnect_and_failure_cleans_up(client):
    session = create(client)
    with client.websocket_connect('/api/qr-pair/' + session['id']) as phone:
        auth(phone, session, 'phone'); phone.receive_json()
        phone.send_json({'type': 'scan', 'content': 'https://example.com'})
        assert phone.receive_json()['state'] == 'detected'
        with client.websocket_connect('/api/qr-pair/' + session['id']) as desktop:
            auth(desktop, session, 'desktop')
            assert desktop.receive_json()['content'] == 'https://example.com'
            desktop.receive_json()
            desktop.send_json({'type': 'failed'})
            assert phone.receive_json()['state'] == 'failed'
            assert desktop.receive_json()['state'] == 'failed'
            time.sleep(.02)
            assert session['id'] not in pairing.sessions
