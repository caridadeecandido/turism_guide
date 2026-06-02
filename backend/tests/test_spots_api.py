"""Backend tests for Turismo que se Sente - tourist spots API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://tourism-audio-guide.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def reseed(session):
    """Reseed DB once to ensure 14 spots present and clean state."""
    r = session.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200, r.text
    assert r.json().get("seeded") == 14


# ===== Health =====
def test_health(session):
    r = session.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# ===== List spots =====
def test_list_spots_returns_14(session):
    r = session.get(f"{API}/spots", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 14
    # Ensure no _id leaked
    for item in data:
        assert "_id" not in item
        assert "id" in item and "name" in item and "audio_description" in item
        assert "accessibility_badges" in item and "accessibility_features" in item


def test_list_spots_filter_praia(session):
    r = session.get(f"{API}/spots", params={"category": "Praia"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert all(s["category"] == "Praia" for s in data)


def test_list_spots_featured_true(session):
    r = session.get(f"{API}/spots", params={"featured": "true"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert all(s["featured"] is True for s in data)


def test_list_spots_category_todos_returns_all(session):
    r = session.get(f"{API}/spots", params={"category": "Todos"}, timeout=10)
    assert r.status_code == 200
    assert len(r.json()) == 14


# ===== Get single spot =====
def test_get_single_spot(session):
    r = session.get(f"{API}/spots", timeout=10)
    spot_id = r.json()[0]["id"]
    g = session.get(f"{API}/spots/{spot_id}", timeout=10)
    assert g.status_code == 200
    data = g.json()
    assert data["id"] == spot_id
    assert "_id" not in data
    assert data["audio_description"]
    assert isinstance(data["accessibility_badges"], list)
    assert isinstance(data["accessibility_features"], list)


def test_get_spot_not_found(session):
    r = session.get(f"{API}/spots/nonexistent-id-xyz", timeout=10)
    assert r.status_code == 404


# ===== Categories =====
def test_categories_include_todos(session):
    r = session.get(f"{API}/categories", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "categories" in data
    cats = data["categories"]
    assert cats[0] == "Todos"
    # Expect some known categories
    for expected in ["Praia", "História e Cultura", "Parque", "Hotel", "Cafeteria", "Mirante"]:
        assert expected in cats


# ===== Create / Update / Delete CRUD =====
@pytest.fixture
def created_spot(session):
    payload = {
        "name": "TEST_Spot_for_CRUD",
        "category": "Praia",
        "neighborhood": "TestBairro",
        "address": "Rua Teste, 123",
        "short_description": "short test",
        "full_description": "full test desc",
        "audio_description": "audio test desc",
        "image_url": "https://example.com/img.jpg",
        "accessibility_badges": ["Acessível"],
        "accessibility_features": ["Rampa de teste"],
        "distance_km": 1.5,
        "featured": False,
    }
    r = session.post(f"{API}/spots", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    sp = r.json()
    assert "_id" not in sp
    yield sp
    # teardown
    session.delete(f"{API}/spots/{sp['id']}", timeout=10)


def test_create_then_get_persists(session, created_spot):
    sid = created_spot["id"]
    r = session.get(f"{API}/spots/{sid}", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "TEST_Spot_for_CRUD"
    assert data["accessibility_badges"] == ["Acessível"]


def test_update_spot(session, created_spot):
    sid = created_spot["id"]
    r = session.put(f"{API}/spots/{sid}", json={"name": "TEST_Updated_Name", "featured": True}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "TEST_Updated_Name"
    assert data["featured"] is True
    # Verify persisted via GET
    g = session.get(f"{API}/spots/{sid}", timeout=10).json()
    assert g["name"] == "TEST_Updated_Name"
    assert g["featured"] is True


def test_update_not_found(session):
    r = session.put(f"{API}/spots/no-such-id", json={"name": "x"}, timeout=10)
    assert r.status_code == 404


def test_delete_spot(session):
    # create
    payload = {
        "name": "TEST_to_delete",
        "category": "Praia",
        "neighborhood": "x",
        "address": "x",
        "short_description": "x",
        "full_description": "x",
        "audio_description": "x",
        "image_url": "https://example.com/x.jpg",
    }
    r = session.post(f"{API}/spots", json=payload, timeout=10)
    sid = r.json()["id"]
    d = session.delete(f"{API}/spots/{sid}", timeout=10)
    assert d.status_code == 200
    assert d.json() == {"deleted": True}
    g = session.get(f"{API}/spots/{sid}", timeout=10)
    assert g.status_code == 404


def test_delete_not_found(session):
    r = session.delete(f"{API}/spots/no-such-id", timeout=10)
    assert r.status_code == 404


# ===== Seed re-idempotency =====
def test_seed_endpoint_idempotent(session):
    r = session.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200
    assert r.json() == {"seeded": 14}
    r2 = session.get(f"{API}/spots", timeout=10)
    assert len(r2.json()) == 14
