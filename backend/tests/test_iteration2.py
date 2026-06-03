"""Iteration 3 backend tests: admin JWT, site-config, partners, seal, inquiries, translation."""
import os
import time
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@turismoquesesente.com.br"
ADMIN_PASSWORD = "Natal@2026!"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_auth(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module", autouse=True)
def reseed(s, admin_auth):
    r = s.post(f"{API}/seed", headers=admin_auth, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("seeded_spots") == 14
    assert body.get("seeded_partners") == 6


# ===== Spots CRUD (still works) =====
def test_spots_still_14(s):
    r = s.get(f"{API}/spots", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 14
    for item in data:
        assert "_id" not in item


def test_categories_include_todos(s):
    r = s.get(f"{API}/categories", timeout=10)
    assert r.status_code == 200
    cats = r.json().get("categories", [])
    assert cats[0] == "Todos"
    assert "Praia" in cats


# ===== Admin Auth =====
def test_admin_login_bad_password(s):
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
    assert r.status_code == 401


def test_admin_login_unknown_user(s):
    r = s.post(f"{API}/admin/login", json={"email": "nobody@example.com", "password": "x"}, timeout=10)
    assert r.status_code == 401


def test_admin_me_requires_token(s):
    r = s.get(f"{API}/admin/me", timeout=10)
    assert r.status_code == 401


def test_admin_me_with_valid_token(s, admin_auth):
    r = s.get(f"{API}/admin/me", headers=admin_auth, timeout=10)
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == ADMIN_EMAIL
    assert "password_hash" not in me


def test_spots_write_requires_admin(s):
    """Without admin token, POST/PUT/DELETE /spots must be 401."""
    payload = {
        "name": "TEST_unauth", "category": "Praia", "neighborhood": "x",
        "address": "x", "short_description": "x", "full_description": "x",
        "audio_description": "x", "image_url": "https://x", "image_alt": "x",
    }
    r = s.post(f"{API}/spots", json=payload, timeout=10)
    assert r.status_code == 401


def test_spots_admin_crud_roundtrip(s, admin_auth):
    payload = {
        "name": "TEST_Admin_Created", "category": "Praia", "neighborhood": "Test",
        "address": "Test", "short_description": "S", "full_description": "F",
        "audio_description": "A", "image_url": "https://example.com/x.jpg",
        "image_alt": "Test image alt", "accessibility_badges": ["Acessível"],
        "accessibility_features": ["x"], "distance_km": 1.0, "featured": False,
    }
    # Create
    rc = s.post(f"{API}/spots", json=payload, headers=admin_auth, timeout=10)
    assert rc.status_code == 200, rc.text
    spot = rc.json()
    spot_id = spot["id"]
    assert spot["image_alt"] == "Test image alt"

    # Update
    ru = s.put(
        f"{API}/spots/{spot_id}",
        json={"name": "TEST_Admin_Updated", "image_alt": "Updated alt"},
        headers=admin_auth,
        timeout=10,
    )
    assert ru.status_code == 200
    assert ru.json()["name"] == "TEST_Admin_Updated"

    # Delete
    rd = s.delete(f"{API}/spots/{spot_id}", headers=admin_auth, timeout=10)
    assert rd.status_code == 200
    assert rd.json().get("deleted") is True

    # Verify removed
    r404 = s.get(f"{API}/spots/{spot_id}", timeout=10)
    assert r404.status_code == 404


# ===== Site Config (public read, admin write) =====
def test_site_config_public_read(s):
    r = s.get(f"{API}/site-config", timeout=10)
    assert r.status_code == 200
    cfg = r.json()
    assert "seal_image_url" in cfg
    assert "seal_alt" in cfg
    assert "welcome_pt" in cfg


def test_site_config_admin_update(s, admin_auth):
    r = s.put(
        f"{API}/admin/site-config",
        json={"footer_text": "TEST footer text"},
        headers=admin_auth,
        timeout=10,
    )
    assert r.status_code == 200, r.text
    assert r.json()["footer_text"] == "TEST footer text"

    # Verify public sees it
    r2 = s.get(f"{API}/site-config", timeout=10)
    assert r2.json()["footer_text"] == "TEST footer text"

    # Restore
    s.put(
        f"{API}/admin/site-config",
        json={"footer_text": "Projeto SENAC RN · Turismo que se Sente © 2026"},
        headers=admin_auth,
        timeout=10,
    )


def test_site_config_update_requires_admin(s):
    r = s.put(f"{API}/admin/site-config", json={"footer_text": "hack"}, timeout=10)
    assert r.status_code == 401


# ===== Partners marketplace =====
EXPECTED_PARTNER_NAMES = {
    "Pousada Inclusiva Ponta Negra",
    "Bistrô Sabor & Sentido",
    "Buggy Acessível Genipabu",
    "Hotel Mar & Inclusão",
    "Tour Natal Sensorial",
    "Cafeteria Aroma & Toque",
}


def test_list_partners_returns_6(s):
    r = s.get(f"{API}/partners", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 6
    assert {p["name"] for p in data} == EXPECTED_PARTNER_NAMES
    for p in data:
        assert "_id" not in p
        assert "id" in p and "seal_code" in p
        assert isinstance(p["seal_code"], str) and len(p["seal_code"]) >= 6


def test_list_partners_filter_hospedagem(s):
    r = s.get(f"{API}/partners", params={"category": "Hospedagem"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert all(p["category"] == "Hospedagem" for p in data)


def test_get_partner_by_id(s):
    partners = s.get(f"{API}/partners", timeout=10).json()
    pid = partners[0]["id"]
    r = s.get(f"{API}/partners/{pid}", timeout=10)
    assert r.status_code == 200
    assert r.json()["id"] == pid


def test_get_partner_not_found(s):
    r = s.get(f"{API}/partners/no-such-id", timeout=10)
    assert r.status_code == 404


# ===== Seal verification =====
def test_seal_verify_invalid(s):
    r = s.get(f"{API}/seal/verify/INVALIDCODE123", timeout=10)
    assert r.status_code == 200
    assert r.json()["valid"] is False


def test_seal_verify_valid(s):
    partners = s.get(f"{API}/partners", timeout=10).json()
    code = partners[0]["seal_code"]
    r = s.get(f"{API}/seal/verify/{code}", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["partner"]["name"] == partners[0]["name"]


# ===== Inquiries (public submit, admin list) =====
def test_create_inquiry_success(s, admin_auth):
    partners = s.get(f"{API}/partners", timeout=10).json()
    pid = partners[0]["id"]
    payload = {
        "partner_id": pid,
        "name": "TEST_User",
        "email": "test@example.com",
        "message": "Solicitação automática de teste",
        "phone": "+5584999990000",
        "people": 2,
    }
    r = s.post(f"{API}/inquiries", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    inq = r.json()
    assert "_id" not in inq and "id" in inq
    assert inq["status"] == "new"

    # Admin should see it
    g = s.get(f"{API}/admin/inquiries", headers=admin_auth, timeout=10)
    assert g.status_code == 200
    assert any(i["id"] == inq["id"] for i in g.json())


def test_create_inquiry_invalid_partner(s):
    r = s.post(
        f"{API}/inquiries",
        json={"partner_id": "no-such", "name": "X", "email": "x@x.com", "message": "x"},
        timeout=10,
    )
    assert r.status_code == 404


def test_admin_inquiries_requires_admin(s):
    r = s.get(f"{API}/admin/inquiries", timeout=10)
    assert r.status_code == 401


# ===== Tourist Auth =====
def test_auth_session_invalid_token(s):
    r = s.post(f"{API}/auth/session", json={"session_token": "INVALID_TOKEN_TEST"}, timeout=15)
    assert r.status_code == 401


def test_auth_me_no_header(s):
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_favorites_requires_auth(s):
    r = requests.get(f"{API}/me/favorites", timeout=10)
    assert r.status_code == 401


# ===== Translation =====
def test_translate_pt_returns_original(s):
    spots = s.get(f"{API}/spots", timeout=10).json()
    sid = spots[0]["id"]
    r = s.get(f"{API}/spots/{sid}/translate", params={"lang": "pt"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["language"] == "pt"
    assert data["name"] == spots[0]["name"]


def test_translate_invalid_lang(s):
    spots = s.get(f"{API}/spots", timeout=10).json()
    sid = spots[0]["id"]
    r = s.get(f"{API}/spots/{sid}/translate", params={"lang": "fr"}, timeout=10)
    assert r.status_code == 400


def test_translate_not_found(s):
    r = s.get(f"{API}/spots/no-such/translate", params={"lang": "en"}, timeout=10)
    assert r.status_code == 404


def test_translate_pt_to_en_with_llm(s):
    spots = s.get(f"{API}/spots", timeout=10).json()
    sid = spots[-1]["id"]
    r = s.get(f"{API}/spots/{sid}/translate", params={"lang": "en"}, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["language"] == "en"
    assert data["name"]
    assert data["short_description"]
    # Translation should differ from PT
    assert data["full_description"] != spots[-1]["full_description"] or data["name"] != spots[-1]["name"]


def test_translate_pt_to_es_and_cache(s):
    spots = s.get(f"{API}/spots", timeout=10).json()
    sid = spots[-1]["id"]
    t0 = time.time()
    r1 = s.get(f"{API}/spots/{sid}/translate", params={"lang": "es"}, timeout=120)
    elapsed1 = time.time() - t0
    assert r1.status_code == 200, r1.text
    es1 = r1.json()
    assert es1["language"] == "es" and es1["name"]

    t1 = time.time()
    r2 = s.get(f"{API}/spots/{sid}/translate", params={"lang": "es"}, timeout=30)
    elapsed2 = time.time() - t1
    assert r2.status_code == 200
    assert r2.json() == es1
    assert elapsed2 < max(2.0, elapsed1 / 2)
