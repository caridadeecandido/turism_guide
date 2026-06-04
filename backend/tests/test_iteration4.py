"""Iteration 4 backend tests: guides resource, inquiries with guide_id, expanded site config."""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@turismoquesesente.com.br"
ADMIN_PASSWORD = "Natal@2026!"

NEW_SEAL_FRAGMENT = "279fc9d7-7038-489d-befd-648ad42c1224"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
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
    assert body.get("seeded_guides") == 4


# ===== Guides public endpoints =====
def test_list_guides_returns_4(s):
    r = s.get(f"{API}/guides", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 4
    names = {g["name"] for g in data}
    assert "Carla Albuquerque" in names
    assert "Rafael Medeiros" in names
    assert "Juliana Cabral" in names
    assert "Diego Fernandes" in names
    for g in data:
        assert "_id" not in g
        assert g["has_seal"] is True
        assert isinstance(g["seal_code"], str) and len(g["seal_code"]) == 10
        assert g["seal_code"] == g["seal_code"].upper()
        # hex check
        int(g["seal_code"], 16)


def test_list_guides_filter_specialty_praia(s):
    r = s.get(f"{API}/guides", params={"specialty": "Praia"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    for g in data:
        assert "Praia" in g["specialties"]


def test_list_guides_filter_focus_libras(s):
    r = s.get(f"{API}/guides", params={"focus": "Libras"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    for g in data:
        assert "Libras" in g["accessibility_focus"]
    # Rafael Medeiros is the Libras specialist
    assert any(g["name"] == "Rafael Medeiros" for g in data)


def test_guides_categories(s):
    r = s.get(f"{API}/guides/categories", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "specialties" in data
    assert "languages" in data
    assert "accessibility_focus" in data
    assert data["specialties"][0] == "Todos"
    assert "Praia" in data["specialties"]
    assert "Libras" in data["languages"]
    assert "Audiodescrição" in data["accessibility_focus"]


def test_get_guide_by_id(s):
    guides = s.get(f"{API}/guides", timeout=10).json()
    gid = guides[0]["id"]
    r = s.get(f"{API}/guides/{gid}", timeout=10)
    assert r.status_code == 200
    g = r.json()
    assert g["id"] == gid
    assert "_id" not in g


def test_get_guide_not_found(s):
    r = s.get(f"{API}/guides/no-such-guide", timeout=10)
    assert r.status_code == 404


def test_translate_guide_pt_returns_original(s):
    guides = s.get(f"{API}/guides", timeout=10).json()
    gid = guides[0]["id"]
    r = s.get(f"{API}/guides/{gid}/translate", params={"lang": "pt"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["language"] == "pt"
    assert data["source"] == "original"
    assert data["name"] == guides[0]["name"]


def test_translate_guide_en_via_llm(s):
    guides = s.get(f"{API}/guides", timeout=10).json()
    # Use Carla — has a longer bio
    g = next(x for x in guides if x["name"] == "Carla Albuquerque")
    r = s.get(f"{API}/guides/{g['id']}/translate", params={"lang": "en"}, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["language"] == "en"
    assert data["source"] in ("llm", "manual")
    # People names should NOT be translated
    assert data["name"] == g["name"]
    # full_description must exist and differ from PT bio
    assert data["full_description"]
    assert data["full_description"] != g["bio"]


def test_translate_guide_es(s):
    guides = s.get(f"{API}/guides", timeout=10).json()
    g = next(x for x in guides if x["name"] == "Rafael Medeiros")
    r = s.get(f"{API}/guides/{g['id']}/translate", params={"lang": "es"}, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["language"] == "es"
    assert data["name"] == g["name"]
    assert data["full_description"]


def test_translate_guide_invalid_lang(s):
    guides = s.get(f"{API}/guides", timeout=10).json()
    gid = guides[0]["id"]
    r = s.get(f"{API}/guides/{gid}/translate", params={"lang": "fr"}, timeout=10)
    assert r.status_code == 400


# ===== Guides admin endpoints =====
def test_create_guide_requires_admin(s):
    r = s.post(f"{API}/guides", json={"name": "TEST_unauth"}, timeout=10)
    assert r.status_code == 401


def test_admin_create_update_delete_guide(s, admin_auth):
    payload = {
        "name": "TEST_Admin_Guide",
        "photo_url": "https://example.com/x.jpg",
        "photo_alt": "Test alt",
        "bio": "Bio test",
        "short_bio": "Short test",
        "specialties": ["Praia"],
        "languages": ["Português"],
        "accessibility_focus": ["Audiodescrição"],
        "phone": "+55 84 99999-0000",
        "email": "test@example.com",
        "rating": 4.5,
        "years_experience": 3,
    }
    r = s.post(f"{API}/guides", json=payload, headers=admin_auth, timeout=10)
    assert r.status_code == 200, r.text
    g = r.json()
    gid = g["id"]
    # seal code auto-generated 10 chars uppercase hex
    assert isinstance(g["seal_code"], str) and len(g["seal_code"]) == 10
    assert g["seal_code"] == g["seal_code"].upper()
    int(g["seal_code"], 16)
    assert g["has_seal"] is True

    # Verify GET
    rg = s.get(f"{API}/guides/{gid}", timeout=10)
    assert rg.status_code == 200
    assert rg.json()["name"] == "TEST_Admin_Guide"

    # Update
    ru = s.put(f"{API}/guides/{gid}", json={"short_bio": "Updated short"}, headers=admin_auth, timeout=10)
    assert ru.status_code == 200
    assert ru.json()["short_bio"] == "Updated short"

    # Verify update persisted
    rg2 = s.get(f"{API}/guides/{gid}", timeout=10)
    assert rg2.json()["short_bio"] == "Updated short"

    # Delete
    rd = s.delete(f"{API}/guides/{gid}", headers=admin_auth, timeout=10)
    assert rd.status_code == 200
    assert rd.json().get("deleted") is True

    # Verify gone
    r404 = s.get(f"{API}/guides/{gid}", timeout=10)
    assert r404.status_code == 404


def test_delete_unknown_guide(s, admin_auth):
    r = s.delete(f"{API}/guides/no-such-guide", headers=admin_auth, timeout=10)
    assert r.status_code == 404


# ===== Inquiries with guide_id =====
def test_inquiry_with_guide_id_succeeds(s, admin_auth):
    guides = s.get(f"{API}/guides", timeout=10).json()
    gid = guides[0]["id"]
    payload = {
        "guide_id": gid,
        "name": "TEST_Guide_Inquiry_User",
        "email": "guidetest@example.com",
        "message": "Quero contratar este guia para um tour acessível",
    }
    r = s.post(f"{API}/inquiries", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    inq = r.json()
    assert inq["guide_id"] == gid
    assert inq["partner_id"] is None
    assert "_id" not in inq

    # Admin should see it
    g = s.get(f"{API}/admin/inquiries", headers=admin_auth, timeout=10)
    assert g.status_code == 200
    inqs = g.json()
    assert any(i["id"] == inq["id"] and i.get("guide_id") == gid for i in inqs)


def test_inquiry_with_invalid_guide_id(s):
    payload = {
        "guide_id": "no-such-guide",
        "name": "TEST_X",
        "email": "x@example.com",
        "message": "x",
    }
    r = s.post(f"{API}/inquiries", json=payload, timeout=10)
    assert r.status_code == 404


def test_inquiry_without_partner_or_guide(s):
    payload = {
        "name": "TEST_X",
        "email": "x@example.com",
        "message": "x",
    }
    r = s.post(f"{API}/inquiries", json=payload, timeout=10)
    assert r.status_code == 400


def test_inquiry_with_partner_id_still_works(s):
    partners = s.get(f"{API}/partners", timeout=10).json()
    pid = partners[0]["id"]
    payload = {
        "partner_id": pid,
        "name": "TEST_Partner_Inquiry",
        "email": "p@example.com",
        "message": "Partner inquiry regression",
    }
    r = s.post(f"{API}/inquiries", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    inq = r.json()
    assert inq["partner_id"] == pid


def test_admin_inquiries_includes_both_types(s, admin_auth):
    r = s.get(f"{API}/admin/inquiries", headers=admin_auth, timeout=10)
    assert r.status_code == 200
    inqs = r.json()
    has_partner = any(i.get("partner_id") for i in inqs)
    has_guide = any(i.get("guide_id") for i in inqs)
    assert has_partner, "Expected at least one partner_id inquiry"
    assert has_guide, "Expected at least one guide_id inquiry"


# ===== Expanded Site Config =====
def test_site_config_has_new_fields(s):
    r = s.get(f"{API}/site-config", timeout=10)
    assert r.status_code == 200
    cfg = r.json()
    for key in [
        "app_name", "about_pt", "about_en", "about_es",
        "contact_email", "emergency_police", "emergency_ambulance",
        "show_guides_tab", "show_marketplace_tab",
    ]:
        assert key in cfg, f"missing site_config field: {key}"
    assert isinstance(cfg["show_guides_tab"], bool)
    assert isinstance(cfg["show_marketplace_tab"], bool)


def test_site_config_seal_url_is_new(s):
    r = s.get(f"{API}/site-config", timeout=10)
    cfg = r.json()
    assert NEW_SEAL_FRAGMENT in cfg["seal_image_url"], (
        f"Expected new seal URL containing {NEW_SEAL_FRAGMENT}, got {cfg['seal_image_url']}"
    )


def test_site_config_admin_update_about_pt(s, admin_auth):
    original = s.get(f"{API}/site-config", timeout=10).json()["about_pt"]
    test_val = "TEST_about_pt_iteration4"
    try:
        r = s.put(
            f"{API}/admin/site-config",
            json={"about_pt": test_val},
            headers=admin_auth,
            timeout=10,
        )
        assert r.status_code == 200, r.text
        assert r.json()["about_pt"] == test_val
        # Verify via GET
        assert s.get(f"{API}/site-config", timeout=10).json()["about_pt"] == test_val
    finally:
        s.put(
            f"{API}/admin/site-config",
            json={"about_pt": original},
            headers=admin_auth,
            timeout=10,
        )


def test_site_config_admin_update_boolean(s, admin_auth):
    try:
        r = s.put(
            f"{API}/admin/site-config",
            json={"show_guides_tab": False},
            headers=admin_auth,
            timeout=10,
        )
        assert r.status_code == 200, r.text
        assert r.json()["show_guides_tab"] is False
        assert s.get(f"{API}/site-config", timeout=10).json()["show_guides_tab"] is False
    finally:
        s.put(
            f"{API}/admin/site-config",
            json={"show_guides_tab": True},
            headers=admin_auth,
            timeout=10,
        )
