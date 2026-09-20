import time
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import qr_pairing as pairing

@pytest.fixture
def client():
    app = FastAPI(); app.include_router(pairing.router)
    pairing.creation_times.clear()
    with TestClient(app) as client:
        yield client
    pairing.sessions.clear()

def create(client):
    response = client.post("/api/qr-pair")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    return response.json()

def exchange(client, session, role, **action):
    return client.post('/api/qr-pair/' + session['id'] + '/exchange', json={
        'role': role, 'token': session[role + '_token'],
        **({'device': 'phone-device-1234567890'} if role == 'phone' else {}), **action})

def test_https_handoff_and_completion(client):
    s = create(client)
    assert exchange(client, s, 'desktop').json()['state'] == 'waiting'
    assert exchange(client, s, 'phone').json()['state'] == 'connected'
    assert exchange(client, s, 'desktop').json()['state'] == 'connected'
    assert exchange(client, s, 'phone', type='scan', content='https://example.com').json()['content'] is None
    assert exchange(client, s, 'desktop').json()['content'] == 'https://example.com'
    exchange(client, s, 'desktop', type='analyzing')
    assert exchange(client, s, 'phone').json()['state'] == 'analyzing'
    exchange(client, s, 'desktop', type='complete')
    assert pairing.sessions[s['id']]['content'] is None
    assert exchange(client, s, 'phone').json()['state'] == 'complete'
    assert exchange(client, s, 'phone').json()['state'] == 'complete'

def test_cross_session_role_and_device_isolation(client):
    a, b = create(client), create(client)
    assert exchange(client, a, 'phone', token=b['phone_token']).status_code == 403
    assert exchange(client, a, 'desktop', token=a['phone_token']).status_code == 403
    assert exchange(client, a, 'phone').status_code == 200
    assert exchange(client, a, 'phone', device='another-phone-1234567890').status_code == 403
    assert exchange(client, a, 'phone', type='complete').status_code == 403
    assert exchange(client, a, 'desktop', type='scan', content='https://example.com').status_code == 403

def test_expiry_and_invalid_session(client, monkeypatch):
    s = create(client)
    assert exchange(client, {**s, 'id': 'missing'}, 'phone').status_code == 410
    pairing.sessions[s['id']]['expires'] = time.time() - 1
    assert exchange(client, s, 'phone').status_code == 410
    assert s['id'] not in pairing.sessions
    monkeypatch.setattr(pairing, 'TTL', .03)
    s = create(client); time.sleep(.06)
    assert s['id'] not in pairing.sessions

def test_validation_and_creation_rate_limit(client):
    s = create(client)
    for content in [' ', 'x' * 6001, '\x00']:
        assert exchange(client, s, 'phone', type='scan', content=content).status_code == 422
    for _ in range(19): create(client)
    assert client.post('/api/qr-pair').status_code == 429

def test_delivery_retries_are_idempotent_and_buffered(client):
    s = create(client)
    exchange(client, s, 'phone', type='scan', content='original')
    exchange(client, s, 'phone', type='scan', content='replacement')
    assert exchange(client, s, 'desktop').json()['content'] == 'original'
    exchange(client, s, 'desktop', type='analyzing')
    exchange(client, s, 'desktop', type='failed')
    assert pairing.sessions[s['id']]['content'] is None
    assert exchange(client, s, 'phone').json()['state'] == 'failed'
    exchange(client, s, 'desktop', type='cancel')
    assert s['id'] not in pairing.sessions

def test_phone_liveness_and_no_cache(client):
    s = create(client)
    exchange(client, s, 'phone')
    pairing.sessions[s['id']]['phone_seen'] -= 20
    response = exchange(client, s, 'desktop')
    assert response.json()['state'] == 'disconnected'
    assert response.headers['cache-control'] == 'no-store'
    exchange(client, s, 'phone')
    assert exchange(client, s, 'desktop').json()['state'] == 'connected'
