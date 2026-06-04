"""Iteration 5 backend tests: Partner admin CRUD + expanded SiteConfig (about/mission/vision/socials/promoters)."""
import os
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
def admin_auth(s):
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ========== Partner admin CRUD ==========
def test_create_partner_requires_admin(s):
    r = s.post(f"{API}/partners", json={"name": "TEST_unauth", "category": "Tours"}, timeout=10)
    assert r.status_code == 401


def test_partner_full_crud(s, admin_auth):
    payload = {
        "name": "TEST_P_iter5",
        "category": "Tours",
        "image_url": "https://example.com/x.png",
        "email": "t@t.com",
    }
    r = s.post(f"{API}/partners", json=payload, headers=admin_auth, timeout=10)
    assert r.status_code == 200, r.text
    p = r.json()
    pid = p["id"]
    assert pid
    assert "_id" not in p
    assert isinstance(p["seal_code"], str) and len(p["seal_code"]) == 10
    assert p["seal_code"] == p["seal_code"].upper()
    int(p["seal_code"], 16)  # hex
    assert p["has_seal"] is True
    assert p["name"] == "TEST_P_iter5"
    assert p["email"] == "t@t.com"

    # PUT
    ru = s.put(f"{API}/partners/{pid}", json={"name": "TEST_P_iter5-updated"}, headers=admin_auth, timeout=10)
    assert ru.status_code == 200
    assert ru.json()["name"] == "TEST_P_iter5-updated"

    # Verify GET
    rg = s.get(f"{API}/partners/{pid}", timeout=10)
    assert rg.status_code == 200
    assert rg.json()["name"] == "TEST_P_iter5-updated"

    # DELETE
    rd = s.delete(f"{API}/partners/{pid}", headers=admin_auth, timeout=10)
    assert rd.status_code == 200
    assert rd.json().get("deleted") is True

    # After delete: GET should 404
    r404 = s.get(f"{API}/partners/{pid}", timeout=10)
    assert r404.status_code == 404


def test_delete_unknown_partner(s, admin_auth):
    r = s.delete(f"{API}/partners/unknown-id-xyz", headers=admin_auth, timeout=10)
    assert r.status_code == 404


def test_list_partners_regression(s):
    r = s.get(f"{API}/partners", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6  # seeded list
    for p in data:
        assert "_id" not in p
        assert "id" in p
        assert "seal_code" in p


# ========== Expanded SiteConfig ==========
NEW_FIELDS = [
    "app_icon_url", "hero_image_url",
    "mission_pt", "mission_en", "mission_es",
    "vision_pt", "vision_en", "vision_es",
    "contact_address",
    "facebook", "youtube", "tiktok", "website",
    "promoter_logos", "promoter_names",
    "show_about_tab",
]


def test_site_config_has_all_new_fields(s):
    r = s.get(f"{API}/site-config", timeout=10)
    assert r.status_code == 200
    cfg = r.json()
    for key in NEW_FIELDS:
        assert key in cfg, f"missing site_config field: {key}"
    # defaults non-empty PT
    assert cfg["mission_pt"].strip()
    assert cfg["vision_pt"].strip()
    # promoter lists
    assert isinstance(cfg["promoter_logos"], list)
    assert isinstance(cfg["promoter_names"], list)
    assert "SENAC RN" in cfg["promoter_names"]
    # show_about_tab boolean default True
    assert isinstance(cfg["show_about_tab"], bool)
    assert cfg["show_about_tab"] is True


def test_site_config_update_new_fields_persist(s, admin_auth):
    original = s.get(f"{API}/site-config", timeout=10).json()
    backup = {k: original.get(k) for k in ("mission_pt", "facebook", "promoter_names", "promoter_logos")}
    try:
        body = {
            "mission_pt": "MISSION TEST",
            "facebook": "fbtest",
            "promoter_names": ["TestProm"],
            "promoter_logos": ["http://x"],
        }
        r = s.put(f"{API}/admin/site-config", json=body, headers=admin_auth, timeout=10)
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["mission_pt"] == "MISSION TEST"
        assert out["facebook"] == "fbtest"
        assert out["promoter_names"] == ["TestProm"]
        assert out["promoter_logos"] == ["http://x"]

        # Public GET reflects
        pub = s.get(f"{API}/site-config", timeout=10).json()
        assert pub["mission_pt"] == "MISSION TEST"
        assert pub["facebook"] == "fbtest"
        assert pub["promoter_names"] == ["TestProm"]
        assert pub["promoter_logos"] == ["http://x"]
    finally:
        # Restore
        s.put(f"{API}/admin/site-config", json=backup, headers=admin_auth, timeout=10)
        restored = s.get(f"{API}/site-config", timeout=10).json()
        assert restored["mission_pt"] == backup["mission_pt"]
        assert restored["facebook"] == backup["facebook"]


def test_site_config_update_requires_admin(s):
    r = s.put(f"{API}/admin/site-config", json={"mission_pt": "x"}, timeout=10)
    assert r.status_code == 401
