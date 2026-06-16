"""
Turismo que se Sente - Backend API v3
Full CMS with admin auth, site config, image upload, translations override.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import asyncio
import base64
import binascii
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt as pyjwt
import cloudinary
import cloudinary.uploader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Static files: the official brand assets live in backend/static/brand and are
# served under /static. User uploads go to Cloudinary, not the local disk
# (the Render free tier filesystem is ephemeral).
STATIC_DIR = ROOT_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Official brand assets are versioned in backend/static/brand and served by the API.
# Stored as relative paths so they stay host-agnostic; clients resolve them
# against the backend base URL.
BRAND_LOGO_URL = "/static/brand/logo.jpeg"
BRAND_SEAL_URL = "/static/brand/selo.jpg"
# Legacy Emergent-hosted URLs, kept only to migrate existing databases away from them.
OLD_EMERGENT_LOGO = "https://customer-assets.emergentagent.com/job_tourism-audio-guide/artifacts/4y5mw8k0_85a45e10-cbc2-40bd-a704-38c569e7c65c.jpeg"
OLD_EMERGENT_SEAL = "https://customer-assets.emergentagent.com/job_tourism-audio-guide/artifacts/6p4z5s8n_279fc9d7-7038-489d-befd-648ad42c1224.JPG"

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = 60 * 24  # 24h

DEFAULT_ADMIN_EMAIL = os.environ['DEFAULT_ADMIN_EMAIL']
DEFAULT_ADMIN_PASSWORD = os.environ['DEFAULT_ADMIN_PASSWORD']

# ========== CLOUDINARY (image hosting) ==========
# Credentials are read from the environment only — never hardcoded. Accept either
# CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>) or the individual
# CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET variables.
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL", "")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CLOUDINARY_UPLOAD_FOLDER = os.environ.get("CLOUDINARY_UPLOAD_FOLDER", "turismo-que-se-sente/uploads")

if CLOUDINARY_URL:
    # The SDK reads CLOUDINARY_URL from the environment automatically; force https URLs.
    cloudinary.config(secure=True)
elif CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )


def cloudinary_configured() -> bool:
    cfg = cloudinary.config()
    return bool(
        getattr(cfg, "cloud_name", None)
        and getattr(cfg, "api_key", None)
        and getattr(cfg, "api_secret", None)
    )

app = FastAPI(title="Turismo que se Sente API", version="3.0.0")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# ========== MODELS ==========
class TouristSpot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    neighborhood: str
    address: str
    short_description: str
    full_description: str
    audio_description: str
    image_url: str
    image_alt: str = ""  # Acessibilidade
    accessibility_badges: List[str] = []
    accessibility_features: List[str] = []
    distance_km: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    featured: bool = False
    # Manual translations (override LLM)
    translations: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TouristSpotCreate(BaseModel):
    name: str
    category: str
    neighborhood: str
    address: str
    short_description: str
    full_description: str
    audio_description: str
    image_url: str
    image_alt: str = ""
    accessibility_badges: List[str] = []
    accessibility_features: List[str] = []
    distance_km: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    featured: bool = False
    translations: Dict[str, Dict[str, str]] = Field(default_factory=dict)


class TouristSpotUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    neighborhood: Optional[str] = None
    address: Optional[str] = None
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    audio_description: Optional[str] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    accessibility_badges: Optional[List[str]] = None
    accessibility_features: Optional[List[str]] = None
    distance_km: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    featured: Optional[bool] = None
    translations: Optional[Dict[str, Dict[str, str]]] = None


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str = ""
    favorites: List[str] = []
    language: str = "pt"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SessionRequest(BaseModel):
    session_token: str


class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    neighborhood: str
    short_description: str
    accessibility_features: List[str] = []
    badges: List[str] = []
    image_url: str
    image_alt: str = ""
    email: str
    phone: str = ""
    whatsapp: str = ""
    price_from: str = ""
    has_seal: bool = True
    seal_code: str = Field(default_factory=lambda: uuid.uuid4().hex[:10].upper())
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PartnerCreate(BaseModel):
    name: str
    category: str
    neighborhood: str = ""
    short_description: str = ""
    accessibility_features: List[str] = []
    badges: List[str] = []
    image_url: str = ""
    image_alt: str = ""
    email: str = ""
    phone: str = ""
    whatsapp: str = ""
    price_from: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    neighborhood: Optional[str] = None
    short_description: Optional[str] = None
    accessibility_features: Optional[List[str]] = None
    badges: Optional[List[str]] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    price_from: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class InquiryCreate(BaseModel):
    partner_id: Optional[str] = None
    guide_id: Optional[str] = None
    name: str
    email: str
    phone: str = ""
    message: str
    date: str = ""
    people: int = 1
    accessibility_needs: str = ""


class Inquiry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: Optional[str] = None
    guide_id: Optional[str] = None
    user_id: Optional[str] = None
    name: str
    email: str
    phone: str = ""
    message: str
    date: str = ""
    people: int = 1
    accessibility_needs: str = ""
    status: str = "new"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ========== GUIDES (Certified tourist guides) ==========
class Guide(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    photo_url: str = ""
    photo_alt: str = ""
    bio: str = ""
    short_bio: str = ""
    specialties: List[str] = []  # ex: ["Praia", "História", "Gastronomia"]
    languages: List[str] = []  # ["Português", "Inglês", "Espanhol", "Libras"]
    certification_course: str = "Curso Turismo que se Sente - Categoria Ouro"
    certification_date: str = ""
    accessibility_focus: List[str] = []  # ["Audiodescrição", "Libras", "Cadeirantes", "Baixa visão", "Autismo"]
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    instagram: str = ""
    region: str = "Natal/RN"
    rating: float = 5.0
    years_experience: int = 0
    has_seal: bool = True
    seal_code: str = Field(default_factory=lambda: uuid.uuid4().hex[:10].upper())
    featured: bool = False
    active: bool = True
    translations: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GuideCreate(BaseModel):
    name: str
    photo_url: str = ""
    photo_alt: str = ""
    bio: str = ""
    short_bio: str = ""
    specialties: List[str] = []
    languages: List[str] = []
    certification_course: str = "Curso Turismo que se Sente - Categoria Ouro"
    certification_date: str = ""
    accessibility_focus: List[str] = []
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    instagram: str = ""
    region: str = "Natal/RN"
    rating: float = 5.0
    years_experience: int = 0
    featured: bool = False
    active: bool = True
    translations: Dict[str, Dict[str, str]] = Field(default_factory=dict)


class GuideUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    photo_alt: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    specialties: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    certification_course: Optional[str] = None
    certification_date: Optional[str] = None
    accessibility_focus: Optional[List[str]] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    instagram: Optional[str] = None
    region: Optional[str] = None
    rating: Optional[float] = None
    years_experience: Optional[int] = None
    featured: Optional[bool] = None
    active: Optional[bool] = None
    translations: Optional[Dict[str, Dict[str, str]]] = None


class TranslateResponse(BaseModel):
    language: str
    name: str
    short_description: str
    full_description: str
    audio_description: str
    source: str = "llm"  # "manual" | "llm" | "original"


class AdminLogin(BaseModel):
    email: str
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: Dict[str, Any]


class SiteConfig(BaseModel):
    id: str = "default"
    # Branding
    app_name: str = "Turismo que se Sente"
    app_logo_url: str = ""
    app_icon_url: str = ""  # square icon
    hero_image_url: str = ""  # banner hero image (about page)
    seal_image_url: str
    seal_alt: str
    # Banners
    header_banner_title: str
    header_banner_subtitle: str
    footer_text: str
    # Welcome strings
    welcome_pt: str
    welcome_en: str
    welcome_es: str
    welcome_sub_pt: str
    welcome_sub_en: str
    welcome_sub_es: str
    # About strings
    about_pt: str = ""
    about_en: str = ""
    about_es: str = ""
    mission_pt: str = ""
    mission_en: str = ""
    mission_es: str = ""
    vision_pt: str = ""
    vision_en: str = ""
    vision_es: str = ""
    # Contact
    contact_email: str = ""
    contact_phone: str = ""
    contact_whatsapp: str = ""
    contact_address: str = ""
    instagram: str = ""
    facebook: str = ""
    youtube: str = ""
    tiktok: str = ""
    website: str = ""
    # Partners / promoters
    promoter_logos: List[str] = []  # list of image URLs of supporting institutions
    promoter_names: List[str] = []
    # Emergency numbers
    emergency_police: str = "190"
    emergency_ambulance: str = "192"
    emergency_fire: str = "193"
    emergency_tourist: str = "(84) 3232-2000"
    # Maintenance / feature flags
    show_guides_tab: bool = True
    show_marketplace_tab: bool = True
    show_about_tab: bool = True
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SiteConfigUpdate(BaseModel):
    app_name: Optional[str] = None
    app_logo_url: Optional[str] = None
    app_icon_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    seal_image_url: Optional[str] = None
    seal_alt: Optional[str] = None
    header_banner_title: Optional[str] = None
    header_banner_subtitle: Optional[str] = None
    footer_text: Optional[str] = None
    welcome_pt: Optional[str] = None
    welcome_en: Optional[str] = None
    welcome_es: Optional[str] = None
    welcome_sub_pt: Optional[str] = None
    welcome_sub_en: Optional[str] = None
    welcome_sub_es: Optional[str] = None
    about_pt: Optional[str] = None
    about_en: Optional[str] = None
    about_es: Optional[str] = None
    mission_pt: Optional[str] = None
    mission_en: Optional[str] = None
    mission_es: Optional[str] = None
    vision_pt: Optional[str] = None
    vision_en: Optional[str] = None
    vision_es: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_address: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    website: Optional[str] = None
    promoter_logos: Optional[List[str]] = None
    promoter_names: Optional[List[str]] = None
    emergency_police: Optional[str] = None
    emergency_ambulance: Optional[str] = None
    emergency_fire: Optional[str] = None
    emergency_tourist: Optional[str] = None
    show_guides_tab: Optional[bool] = None
    show_marketplace_tab: Optional[bool] = None
    show_about_tab: Optional[bool] = None


class ImageUpload(BaseModel):
    base64: str  # data:image/jpeg;base64,...
    alt: str = ""


DEFAULT_SITE_CONFIG = {
    "id": "default",
    "app_name": "Turismo que se Sente",
    "app_logo_url": BRAND_LOGO_URL,
    "app_icon_url": BRAND_LOGO_URL,
    "hero_image_url": "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=1200&q=80",
    "seal_image_url": BRAND_SEAL_URL,
    "seal_alt": "Selo oficial Turismo que se Sente — Categoria Ouro. Medalha dourada com fundo roxo e ícones de cadeirante, cão-guia, audição assistida, Libras e Braille.",
    "header_banner_title": "Turismo que se Sente",
    "header_banner_subtitle": "Natal/RN acessível para todos",
    "footer_text": "Projeto SENAC RN · Turismo que se Sente © 2026",
    "welcome_pt": "Bem-vindo(a) a Natal!",
    "welcome_en": "Welcome to Natal!",
    "welcome_es": "¡Bienvenido(a) a Natal!",
    "welcome_sub_pt": "Explore a cidade com autonomia e inclusão.",
    "welcome_sub_en": "Explore the city with autonomy and inclusion.",
    "welcome_sub_es": "Explora la ciudad con autonomía e inclusión.",
    "about_pt": "Turismo que se Sente é a primeira certificação brasileira de acessibilidade turística sensorial, criada pelo SENAC RN. Estabelecimentos e guias certificados passam por capacitação especializada (120h) em audiodescrição, Libras, atendimento a cães-guia e PCD. Nosso objetivo é tornar Natal e o Rio Grande do Norte referências em turismo verdadeiramente inclusivo, onde pessoas com deficiência visual, auditiva, motora ou intelectual possam explorar com autonomia e dignidade.",
    "about_en": "Turismo que se Sente is Brazil's first sensory tourism accessibility certification, created by SENAC RN. Certified businesses and guides undergo specialized training (120h) in audio description, Brazilian sign language (Libras), guide dogs, and accessibility for persons with disabilities. Our goal is to make Natal and Rio Grande do Norte references in truly inclusive tourism, where people with visual, hearing, motor or intellectual disabilities can explore with autonomy and dignity.",
    "about_es": "Turismo que se Sente es la primera certificación brasileña de accesibilidad turística sensorial, creada por SENAC RN. Establecimientos y guías certificados reciben capacitación especializada (120h) en audiodescripción, lengua de señas brasileña (Libras), perros guía y atención a personas con discapacidad. Nuestro objetivo es convertir a Natal y Rio Grande do Norte en referencias de turismo verdaderamente inclusivo, donde personas con discapacidad visual, auditiva, motora o intelectual puedan explorar con autonomía y dignidad.",
    "mission_pt": "Promover um turismo verdadeiramente inclusivo em Natal/RN, capacitando profissionais e estabelecimentos para receber visitantes com qualquer tipo de deficiência com respeito, autonomia e excelência.",
    "mission_en": "Promote truly inclusive tourism in Natal/RN, training professionals and businesses to welcome visitors with any kind of disability with respect, autonomy, and excellence.",
    "mission_es": "Promover un turismo verdaderamente inclusivo en Natal/RN, capacitando a profesionales y establecimientos para recibir visitantes con cualquier tipo de discapacidad con respeto, autonomía y excelencia.",
    "vision_pt": "Ser referência nacional em turismo acessível e sensorial, mostrando que destinos podem ser sentidos por todos os sentidos, e que toda pessoa merece viver experiências turísticas com dignidade.",
    "vision_en": "To be a national reference in accessible and sensory tourism, showing that destinations can be felt through all senses, and that everyone deserves to live tourism experiences with dignity.",
    "vision_es": "Ser referencia nacional en turismo accesible y sensorial, mostrando que los destinos pueden sentirse con todos los sentidos, y que toda persona merece vivir experiencias turísticas con dignidad.",
    "contact_email": "contato@turismoquesesente.com.br",
    "contact_phone": "+55 84 3232-2000",
    "contact_whatsapp": "+55 84 99999-0000",
    "contact_address": "SENAC RN — Av. Senador Salgado Filho, 2860 · Natal/RN · CEP 59056-000",
    "instagram": "@turismoquesesente",
    "facebook": "turismoquesesente",
    "youtube": "@turismoquesesente",
    "tiktok": "@turismoquesesente",
    "website": "https://www.turismoquesesente.com.br",
    "promoter_logos": [
        "https://upload.wikimedia.org/wikipedia/commons/3/30/Logo_do_Senac.svg",
    ],
    "promoter_names": ["SENAC RN"],
    "emergency_police": "190",
    "emergency_ambulance": "192",
    "emergency_fire": "193",
    "emergency_tourist": "(84) 3232-2000",
    "show_guides_tab": True,
    "show_marketplace_tab": True,
    "show_about_tab": True,
    "updated_at": datetime.now(timezone.utc).isoformat(),
}


SEED_SPOTS = [
    {"name": "Morro do Careca", "category": "Praia", "neighborhood": "Ponta Negra",
     "address": "Av. Erivan França, Ponta Negra, Natal - RN",
     "short_description": "Cartão-postal de Natal, duna de 120m rodeada de Mata Atlântica.",
     "full_description": "O Morro do Careca é o símbolo turístico de Natal: uma duna de cerca de 120 metros de altura, cercada pela Mata Atlântica e banhada pelo mar azul-turquesa de Ponta Negra.",
     "audio_description": "Você está em frente ao Morro do Careca, o cartão-postal de Natal. Imagine uma imensa duna de areia clara, com cerca de cento e vinte metros de altura, que se ergue diretamente da praia. Em suas laterais, vegetação verde de Mata Atlântica forma um contraste com a areia dourada. À sua frente, o oceano Atlântico se estende em tons de azul-turquesa, com ondas suaves que quebram na orla. O som constante das ondas, o cheiro salgado do mar e a brisa morna no rosto fazem deste o local mais sensorial de Natal.",
     "image_url": "/static/spots/morro-do-careca.jpg",
     "image_alt": "Vista aérea da praia de Ponta Negra com mar azul-turquesa e, ao fundo, o Morro do Careca: uma grande duna de areia clara descendo por um morro coberto de vegetação verde.",
     "accessibility_badges": ["Acessível", "Banheiro acessível", "Piso tátil"],
     "accessibility_features": ["Rampa de acesso na orla de Ponta Negra", "Banheiro acessível na praia", "Vagas reservadas próximas ao calçadão", "Piso tátil em parte do percurso", "Acompanhamento recomendado na trilha de acesso"],
     "distance_km": 0.2, "latitude": -5.8819, "longitude": -35.1664, "featured": True},
    {"name": "Forte dos Reis Magos", "category": "História e Cultura", "neighborhood": "Praia do Forte",
     "address": "Praia do Forte, s/n, Natal - RN",
     "short_description": "Construção mais antiga do RN, erguida em 1598 à beira-mar.",
     "full_description": "Erguida em 1598, a Fortaleza dos Reis Magos é a construção mais antiga do Rio Grande do Norte, em formato de estrela de cinco pontas, na entrada da Baía da Formosa.",
     "audio_description": "Você está diante da Fortaleza dos Reis Magos, construída em 1598. Imagine uma imponente edificação em pedra calcária, com paredes grossas e amareladas pelo tempo, em formato de estrela de cinco pontas. À sua frente, o Oceano Atlântico se encontra com o Rio Potengi. Canhões antigos apontam para o horizonte. Você pode sentir o vento salgado e ouvir o quebrar das ondas contra as muralhas seculares.",
     "image_url": "/static/spots/forte-dos-reis-magos.jpg",
     "image_alt": "Vista aérea da fortaleza branca em formato de estrela de cinco pontas, cercada pelo mar, com construções de telhado vermelho e uma capela no pátio interno.",
     "accessibility_badges": ["Acessível", "Audioguia"],
     "accessibility_features": ["Acesso por rampa", "Audiodescrição guiada", "Estacionamento próximo", "Apoio de guia sensorial"],
     "distance_km": 3.2, "latitude": -5.7548, "longitude": -35.1916, "featured": True},
    {"name": "Praia de Ponta Negra", "category": "Praia", "neighborhood": "Ponta Negra",
     "address": "Av. Erivan França, Ponta Negra, Natal - RN",
     "short_description": "A praia mais famosa de Natal, com calçadão e bares.",
     "full_description": "Ponta Negra é a praia urbana mais famosa de Natal, com mais de 4km de extensão, calçadão movimentado e o Morro do Careca ao fundo.",
     "audio_description": "Você está na Praia de Ponta Negra. Imagine uma vasta faixa de areia clara e fina que se estende por quatro quilômetros, com águas mornas e tranquilas em tons de verde e azul. O calçadão de pedras portuguesas, em ondas brancas e pretas, segue paralelo ao mar. Quiosques coloridos vendem água de coco. Ao fundo, à direita, o imponente Morro do Careca encerra a paisagem.",
     "image_url": "/static/spots/praia-de-ponta-negra.jpg",
     "image_alt": "Vista panorâmica de Ponta Negra: longa faixa de areia em curva, mar verde-azulado à esquerda com o Morro do Careca ao fundo e o bairro de casas com telhados vermelhos à direita.",
     "accessibility_badges": ["Acessível", "Cadeira anfíbia"],
     "accessibility_features": ["Cadeiras anfíbias nos postos salva-vidas", "Calçadão acessível", "Banheiros adaptados nos quiosques", "Faixas de areia compactada"],
     "distance_km": 0.5, "latitude": -5.8800, "longitude": -35.1700, "featured": True},
    {"name": "Parque das Dunas", "category": "Parque", "neighborhood": "Tirol",
     "address": "Av. Alexandrino de Alencar, s/n, Tirol, Natal - RN",
     "short_description": "Segunda maior reserva urbana de Mata Atlântica do Brasil.",
     "full_description": "1.172 hectares de Mata Atlântica urbana, com trilhas ecológicas, anfiteatro e rica biodiversidade.",
     "audio_description": "Você está na entrada do Parque das Dunas. Uma densa Mata Atlântica forma um teto verde sobre trilhas de areia. O ar é fresco e úmido, com aromas de folhas e flores tropicais. Você ouve o canto do sabiá-laranjeira e o farfalhar das folhas ao vento.",
     "image_url": "/static/spots/parque-das-dunas.jpg",
     "image_alt": "Entrada do Parque das Dunas, com letreiro de pedra escrito Parque das Dunas e Bosque dos Namorados, portão verde com desenho de folha e um painel colorido ao lado.",
     "accessibility_badges": ["Acessível", "Trilhas acessíveis"],
     "accessibility_features": ["Trilha Peroba adaptada", "Guias com audiodescrição", "Mapa tátil na entrada", "Banheiros adaptados"],
     "distance_km": 4.1, "latitude": -5.8367, "longitude": -35.1947, "featured": True},
    {"name": "Dunas de Genipabu", "category": "Praia", "neighborhood": "Extremoz",
     "address": "Genipabu, Extremoz - RN (20km de Natal)",
     "short_description": "Dunas móveis com passeio de buggy e dromedários.",
     "full_description": "Cenário de dunas móveis mais famoso do Brasil, com lagoa, buggy e dromedários.",
     "audio_description": "Você está nas Dunas de Genipabu. Imagine um vasto deserto de areia clara, com dunas que sobem e descem como ondas gigantes. Há uma lagoa de águas escuras e cristalinas no meio das dunas. Você pode ouvir o vento que carrega grãos de areia.",
     "image_url": "/static/spots/dunas-de-genipabu.jpg",
     "image_alt": "Grande duna de areia clara sob céu azul com nuvens, e um buggy amarelo descendo a crista da duna, deixando marcas de pneu na areia.",
     "accessibility_badges": ["Buggy adaptado"],
     "accessibility_features": ["Buggy adaptado mediante agendamento", "Apoio para embarque na lagoa", "Guias com experiência inclusiva"],
     "distance_km": 20.0, "latitude": -5.6694, "longitude": -35.2128, "featured": True},
    {"name": "Praia da Pipa", "category": "Praia", "neighborhood": "Tibau do Sul",
     "address": "Tibau do Sul - RN (85km de Natal)",
     "short_description": "Praia paradisíaca com falésias e golfinhos.",
     "full_description": "Falésias coloridas, golfinhos que se aproximam dos banhistas e uma vila charmosa.",
     "audio_description": "Você está na Praia da Pipa. Falésias verticais em tons de vermelho, laranja e branco. O mar verde-esmeralda é morno e calmo. Em certas horas, golfinhos se aproximam e podem ser ouvidos respirando próximos à areia.",
     "image_url": "https://images.pexels.com/photos/18336311/pexels-photo-18336311.jpeg?w=1200&q=80",
     "image_alt": "Praia com falésias avermelhadas e mar verde-esmeralda calmo.",
     "accessibility_badges": ["Parcialmente acessível"],
     "accessibility_features": ["Cadeira anfíbia na Praia do Centro", "Pousadas com quartos adaptados", "Restaurantes com cardápios em braille"],
     "distance_km": 85.0, "latitude": -6.2295, "longitude": -35.0469, "featured": True},
    {"name": "Maracajaú", "category": "Praia", "neighborhood": "Maxaranguape",
     "address": "Maracajaú, Maxaranguape - RN (50km de Natal)",
     "short_description": "Parrachos com piscinas naturais e mergulho.",
     "full_description": "O 'Caribe brasileiro': piscinas naturais a 7km da costa, com peixes coloridos.",
     "audio_description": "Você está em Maracajaú. Catamarãs partem rumo aos parrachos, bancos de coral que formam piscinas naturais a sete quilômetros da costa. A água é morna, transparente.",
     "image_url": "/static/spots/maracajau.jpg",
     "image_alt": "Vista aérea do mar verde-turquesa de Maracajaú com bancos de coral (parrachos) e vários barcos ancorados, ao lado de uma faixa de areia com coqueiros.",
     "accessibility_badges": ["Embarcação adaptada"],
     "accessibility_features": ["Catamarã com rampa", "Coletes adaptados", "Equipe treinada em snorkel inclusivo"],
     "distance_km": 50.0, "latitude": -5.4083, "longitude": -35.2547, "featured": False},
    {"name": "Centro Histórico - Cidade Alta", "category": "História e Cultura", "neighborhood": "Cidade Alta",
     "address": "Cidade Alta, Natal - RN",
     "short_description": "Bairro mais antigo de Natal, com igrejas e museus.",
     "full_description": "Bairro fundador de Natal, com Igreja Matriz, Memorial Câmara Cascudo e Beco da Lama.",
     "audio_description": "Você está no Centro Histórico de Natal, a Cidade Alta. Ruas estreitas calçadas em pedras irregulares, com casarões coloniais pintados em cores vivas. A Igreja Matriz, de fachada branca e cinza, domina a praça.",
     "image_url": "/static/spots/centro-historico.jpg",
     "image_alt": "Praça do Centro Histórico com grandes árvores frondosas, um obelisco de pedra ao centro e casarões coloniais brancos e coloridos ao redor.",
     "accessibility_badges": ["Audioguia"],
     "accessibility_features": ["Tour com audiodescrição", "Mapas táteis no Memorial Câmara Cascudo", "Rota acessível"],
     "distance_km": 5.5, "latitude": -5.7811, "longitude": -35.2086, "featured": False},
    {"name": "Praia do Meio", "category": "Praia", "neighborhood": "Praia do Meio",
     "address": "Av. Pres. Café Filho, Praia do Meio, Natal - RN",
     "short_description": "Praia urbana com calçadão e barracas.",
     "full_description": "Entre a Praia do Forte e a Praia dos Artistas, com calçadão arborizado e música ao vivo.",
     "audio_description": "Você está na Praia do Meio. O calçadão é amplo, com bancos sombreados por coqueiros. O mar é forte aqui, com ondas que rugem ao bater na areia.",
     "image_url": "/static/spots/praia-do-meio.jpg",
     "image_alt": "Estátua de Iemanjá, mulher de vestido azul e coroa com estrela e braços abertos, sobre a praia, cercada por guarda-sóis coloridos, com o mar ao fundo.",
     "accessibility_badges": ["Calçadão acessível"],
     "accessibility_features": ["Calçadão plano", "Barracas com banheiros adaptados", "Estacionamento com vagas reservadas"],
     "distance_km": 2.8, "latitude": -5.7700, "longitude": -35.1900, "featured": False},
    {"name": "Praia dos Artistas", "category": "Praia", "neighborhood": "Areia Preta",
     "address": "Av. Pres. Café Filho, Areia Preta, Natal - RN",
     "short_description": "Tradicional praia urbana com a Capitania das Artes.",
     "full_description": "Vida noturna, Espaço Cultural Capitania das Artes e nascer do sol espetacular.",
     "audio_description": "Você está na Praia dos Artistas. Bancos coloridos em formato de paleta de pintor decoram o calçadão. O mar é mais bravo aqui, com ondas que se quebram em espuma branca.",
     "image_url": "/static/spots/praia-dos-artistas.jpg",
     "image_alt": "Praia urbana com ondas fortes e espuma branca, um molhe de pedras ao longo da orla, guarda-corpo azul em primeiro plano e prédios da cidade ao fundo.",
     "accessibility_badges": ["Parcialmente acessível"],
     "accessibility_features": ["Calçadão acessível", "Espaço cultural com elevador", "Banheiros adaptados"],
     "distance_km": 3.5, "latitude": -5.7644, "longitude": -35.1856, "featured": False},
    {"name": "Mirante de Mãe Luiza", "category": "Mirante", "neighborhood": "Mãe Luiza",
     "address": "Rua Açu, Mãe Luiza, Natal - RN",
     "short_description": "Farol histórico com vista panorâmica de Natal.",
     "full_description": "Farol de 1951 com a melhor vista panorâmica de Natal, abraçando mar, cidade e dunas.",
     "audio_description": "Você está no alto do Mirante de Mãe Luiza. Vista de 360 graus: à frente o oceano infinito, à direita a Via Costeira, à esquerda o Morro do Careca, atrás a cidade. O vento é forte e salgado.",
     "image_url": "/static/spots/mirante-mae-luiza.jpg",
     "image_alt": "Vista do mirante de Mãe Luiza: fileiras de postes brancos, um parquinho colorido e, ao fundo, o mar no horizonte sob céu azul.",
     "accessibility_badges": ["Acessível"],
     "accessibility_features": ["Estacionamento próximo", "Acesso por rampa", "Placas em braille"],
     "distance_km": 4.0, "latitude": -5.7872, "longitude": -35.1872, "featured": False},
    {"name": "Catedral Nova de Natal", "category": "História e Cultura", "neighborhood": "Tirol",
     "address": "Praça Pio X, Tirol, Natal - RN",
     "short_description": "Templo modernista em formato de pirâmide.",
     "full_description": "Marco modernista do Nordeste, com formato piramidal único e vitrais coloridos.",
     "audio_description": "Você está diante da Catedral Nova de Natal. Construção piramidal monumental, paredes brancas e vitrais coloridos como fragmentos de gemas. No interior, a luz colorida cria um ambiente místico.",
     "image_url": "/static/spots/catedral-nova.jpg",
     "image_alt": "Vista aérea da Catedral Nova de Natal, com grande telhado de concreto curvo e nervurado e uma alta cruz de concreto ao lado, cercada por prédios e pela praça.",
     "accessibility_badges": ["Acessível"],
     "accessibility_features": ["Rampa de acesso", "Bancos reservados próximos ao altar", "Audioguia na sacristia"],
     "distance_km": 5.0, "latitude": -5.7942, "longitude": -35.2017, "featured": False},
    {"name": "Café do Forte", "category": "Cafeteria", "neighborhood": "Praia do Forte",
     "address": "Próximo ao Forte dos Reis Magos, Natal - RN",
     "short_description": "Cafeteria com cardápio em braille e vista para o mar.",
     "full_description": "Cafeteria charmosa próxima à Fortaleza dos Reis Magos, com atendimento inclusivo.",
     "audio_description": "Você está no Café do Forte. O ambiente cheira a café e bolo de tapioca. Mesas de madeira com cardápios em braille. Pelas janelas, é possível ouvir o quebrar das ondas.",
     "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
     "image_alt": "Cafeteria aconchegante com mesas de madeira e janelas amplas com vista para o mar.",
     "accessibility_badges": ["Cardápio em braille", "Acessível"],
     "accessibility_features": ["Cardápio em braille", "Mesas adaptadas", "Atendentes treinados"],
     "distance_km": 2.9, "latitude": -5.7542, "longitude": -35.1922, "featured": False},
    {"name": "Hotel Parque da Costeira", "category": "Hotel", "neighborhood": "Ponta Negra",
     "address": "Av. Senador Dinarte Mariz, Via Costeira, Natal - RN",
     "short_description": "Hotel resort com quartos acessíveis na Via Costeira.",
     "full_description": "Resort com extensa área verde, piscinas, acesso direto à praia e quartos totalmente adaptados.",
     "audio_description": "Você está no Hotel Parque da Costeira. Lobby amplo, arejado, piso de mármore. Som de fonte ecoando. Aroma de flores tropicais. Quartos acessíveis no térreo, com varanda e vista para o mar.",
     "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
     "image_alt": "Lobby de hotel resort com fonte e plantas tropicais.",
     "accessibility_badges": ["Quartos acessíveis"],
     "accessibility_features": ["Banheiros adaptados", "Piscina com elevador hidráulico", "Cardápio em braille", "Equipe treinada em Libras"],
     "distance_km": 5.0, "latitude": -5.8500, "longitude": -35.1850, "featured": False},
]

# ===== Traduções manuais (custo zero) EN / ES (Espanha) dos atrativos =====
# O endpoint translate_spot prioriza estas traduções manuais sobre a LLM.
# Chaveadas por nome; mescladas em SEED_SPOTS[].translations no import.
SPOT_TRANSLATIONS = {
    "Morro do Careca": {
        "en": {
            "name": "Morro do Careca",
            "short_description": "Natal's postcard: a 120-metre dune surrounded by Atlantic Forest.",
            "full_description": "Morro do Careca is Natal's tourism icon: a dune about 120 metres high, surrounded by Atlantic Forest and bathed by the turquoise-blue sea of Ponta Negra.",
            "audio_description": "You are standing in front of Morro do Careca, Natal's postcard view. Picture an immense dune of pale sand, about one hundred and twenty metres tall, rising straight from the beach. Along its sides, the green vegetation of the Atlantic Forest contrasts with the golden sand. Ahead of you, the Atlantic Ocean stretches out in shades of turquoise blue, with gentle waves breaking along the shore. The constant sound of the waves, the salty smell of the sea and the warm breeze on your face make this the most sensory spot in Natal.",
        },
        "es": {
            "name": "Morro do Careca",
            "short_description": "La postal de Natal: una duna de 120 metros rodeada de Bosque Atlántico.",
            "full_description": "El Morro do Careca es el símbolo turístico de Natal: una duna de unos 120 metros de altura, rodeada de Bosque Atlántico y bañada por el mar azul turquesa de Ponta Negra.",
            "audio_description": "Estás frente al Morro do Careca, la postal de Natal. Imagina una inmensa duna de arena clara, de unos ciento veinte metros de altura, que se alza directamente desde la playa. En sus laterales, la verde vegetación del Bosque Atlántico contrasta con la arena dorada. Ante ti, el océano Atlántico se extiende en tonos azul turquesa, con suaves olas que rompen en la orilla. El sonido constante de las olas, el olor salado del mar y la cálida brisa en el rostro hacen de este el lugar más sensorial de Natal.",
        },
    },
    "Forte dos Reis Magos": {
        "en": {
            "name": "Reis Magos Fort",
            "short_description": "The oldest building in Rio Grande do Norte, built in 1598 by the sea.",
            "full_description": "Built in 1598, the Reis Magos Fortress is the oldest building in Rio Grande do Norte, shaped like a five-pointed star at the entrance of Formosa Bay.",
            "audio_description": "You are standing before the Reis Magos Fortress, built in 1598. Picture an imposing limestone building, with thick walls yellowed by time, shaped like a five-pointed star. In front of you, the Atlantic Ocean meets the Potengi River. Old cannons point towards the horizon. You can feel the salty wind and hear the waves breaking against the centuries-old walls.",
        },
        "es": {
            "name": "Fuerte de los Reyes Magos",
            "short_description": "La construcción más antigua de Rio Grande do Norte, levantada en 1598 junto al mar.",
            "full_description": "Levantada en 1598, la Fortaleza de los Reyes Magos es la construcción más antigua de Rio Grande do Norte, con forma de estrella de cinco puntas, a la entrada de la Bahía de la Formosa.",
            "audio_description": "Estás ante la Fortaleza de los Reyes Magos, construida en 1598. Imagina una imponente edificación de piedra caliza, con muros gruesos y amarillentos por el paso del tiempo, en forma de estrella de cinco puntas. Ante ti, el océano Atlántico se encuentra con el río Potengi. Antiguos cañones apuntan al horizonte. Puedes sentir el viento salado y oír el romper de las olas contra las murallas centenarias.",
        },
    },
    "Praia de Ponta Negra": {
        "en": {
            "name": "Ponta Negra Beach",
            "short_description": "Natal's most famous beach, with a promenade and bars.",
            "full_description": "Ponta Negra is Natal's most famous urban beach, over 4 km long, with a lively promenade and Morro do Careca in the background.",
            "audio_description": "You are at Ponta Negra Beach. Picture a vast strip of fine, pale sand stretching for four kilometres, with warm, calm waters in shades of green and blue. The promenade, paved with Portuguese stones in black-and-white wave patterns, runs parallel to the sea. Colourful kiosks sell coconut water. In the distance, to the right, the imposing Morro do Careca closes off the landscape.",
        },
        "es": {
            "name": "Playa de Ponta Negra",
            "short_description": "La playa más famosa de Natal, con paseo marítimo y bares.",
            "full_description": "Ponta Negra es la playa urbana más famosa de Natal, con más de 4 km de extensión, un animado paseo marítimo y el Morro do Careca al fondo.",
            "audio_description": "Estás en la Playa de Ponta Negra. Imagina una amplia franja de arena fina y clara que se extiende a lo largo de cuatro kilómetros, con aguas cálidas y tranquilas en tonos verdes y azules. El paseo marítimo, empedrado al estilo portugués con olas en blanco y negro, discurre paralelo al mar. Quioscos de colores venden agua de coco. Al fondo, a la derecha, el imponente Morro do Careca cierra el paisaje.",
        },
    },
    "Parque das Dunas": {
        "en": {
            "name": "Dunes Park",
            "short_description": "Brazil's second-largest urban Atlantic Forest reserve.",
            "full_description": "1,172 hectares of urban Atlantic Forest, with ecological trails, an amphitheatre and rich biodiversity.",
            "audio_description": "You are at the entrance of the Dunes Park. A dense Atlantic Forest forms a green canopy over sandy trails. The air is cool and humid, carrying the scents of leaves and tropical flowers. You can hear the song of the rufous-bellied thrush and the rustling of leaves in the wind.",
        },
        "es": {
            "name": "Parque de las Dunas",
            "short_description": "La segunda mayor reserva urbana de Bosque Atlántico de Brasil.",
            "full_description": "1.172 hectáreas de Bosque Atlántico urbano, con senderos ecológicos, anfiteatro y una rica biodiversidad.",
            "audio_description": "Estás en la entrada del Parque de las Dunas. Un denso Bosque Atlántico forma un techo verde sobre senderos de arena. El aire es fresco y húmedo, con aromas de hojas y flores tropicales. Oyes el canto del zorzal y el susurro de las hojas con el viento.",
        },
    },
    "Dunas de Genipabu": {
        "en": {
            "name": "Genipabu Dunes",
            "short_description": "Shifting dunes with buggy rides and dromedaries.",
            "full_description": "Brazil's most famous shifting-dune landscape, with a lagoon, buggies and dromedaries.",
            "audio_description": "You are at the Genipabu Dunes. Picture a vast desert of pale sand, with dunes that rise and fall like giant waves. A lagoon of dark, crystal-clear water lies among the dunes. You can hear the wind carrying grains of sand.",
        },
        "es": {
            "name": "Dunas de Genipabu",
            "short_description": "Dunas móviles con paseos en buggy y dromedarios.",
            "full_description": "El paisaje de dunas móviles más famoso de Brasil, con laguna, buggies y dromedarios.",
            "audio_description": "Estás en las Dunas de Genipabu. Imagina un vasto desierto de arena clara, con dunas que suben y bajan como olas gigantes. Hay una laguna de aguas oscuras y cristalinas en medio de las dunas. Puedes oír el viento que arrastra granos de arena.",
        },
    },
    "Praia da Pipa": {
        "en": {
            "name": "Pipa Beach",
            "short_description": "A paradise beach with cliffs and dolphins.",
            "full_description": "Colourful cliffs, dolphins that come close to bathers, and a charming village.",
            "audio_description": "You are at Pipa Beach. Vertical cliffs in shades of red, orange and white. The emerald-green sea is warm and calm. At certain times, dolphins come close and can be heard breathing near the shore.",
        },
        "es": {
            "name": "Playa de Pipa",
            "short_description": "Una playa paradisíaca con acantilados y delfines.",
            "full_description": "Acantilados de colores, delfines que se acercan a los bañistas y un pueblo con encanto.",
            "audio_description": "Estás en la Playa de Pipa. Acantilados verticales en tonos rojos, naranjas y blancos. El mar verde esmeralda es cálido y tranquilo. En ciertos momentos, los delfines se acercan y se les puede oír respirar cerca de la arena.",
        },
    },
    "Maracajaú": {
        "en": {
            "name": "Maracajaú",
            "short_description": "Coral reefs with natural pools and snorkelling.",
            "full_description": "The 'Brazilian Caribbean': natural pools 7 km offshore, full of colourful fish.",
            "audio_description": "You are in Maracajaú. Catamarans set off towards the parrachos, coral banks that form natural pools seven kilometres off the coast. The water is warm and crystal-clear.",
        },
        "es": {
            "name": "Maracajaú",
            "short_description": "Arrecifes de coral con piscinas naturales y submarinismo.",
            "full_description": "El 'Caribe brasileño': piscinas naturales a 7 km de la costa, con peces de colores.",
            "audio_description": "Estás en Maracajaú. Los catamaranes parten hacia los parrachos, bancos de coral que forman piscinas naturales a siete kilómetros de la costa. El agua es cálida y transparente.",
        },
    },
    "Centro Histórico - Cidade Alta": {
        "en": {
            "name": "Historic Center – Cidade Alta",
            "short_description": "Natal's oldest district, with churches and museums.",
            "full_description": "Natal's founding district, home to the Mother Church, the Câmara Cascudo Memorial and the Beco da Lama.",
            "audio_description": "You are in Natal's Historic Center, the Cidade Alta. Narrow streets paved with uneven cobblestones, lined with colonial mansions painted in bright colours. The Mother Church, with its white-and-grey façade, dominates the square.",
        },
        "es": {
            "name": "Centro Histórico – Cidade Alta",
            "short_description": "El barrio más antiguo de Natal, con iglesias y museos.",
            "full_description": "El barrio fundador de Natal, con la Iglesia Matriz, el Memorial Câmara Cascudo y el Beco da Lama.",
            "audio_description": "Estás en el Centro Histórico de Natal, la Cidade Alta. Calles estrechas empedradas con piedras irregulares, con casonas coloniales pintadas en colores vivos. La Iglesia Matriz, de fachada blanca y gris, domina la plaza.",
        },
    },
    "Praia do Meio": {
        "en": {
            "name": "Praia do Meio",
            "short_description": "An urban beach with a promenade and beach huts.",
            "full_description": "Between Praia do Forte and Praia dos Artistas, with a tree-lined promenade and live music.",
            "audio_description": "You are at Praia do Meio. The promenade is wide, with benches shaded by coconut palms. The sea is rough here, with waves that roar as they hit the sand.",
        },
        "es": {
            "name": "Playa do Meio",
            "short_description": "Playa urbana con paseo marítimo y chiringuitos.",
            "full_description": "Entre la Praia do Forte y la Praia dos Artistas, con un paseo arbolado y música en directo.",
            "audio_description": "Estás en la Playa do Meio. El paseo es amplio, con bancos a la sombra de los cocoteros. El mar es fuerte aquí, con olas que rugen al golpear la arena.",
        },
    },
    "Praia dos Artistas": {
        "en": {
            "name": "Praia dos Artistas",
            "short_description": "A traditional urban beach, home to the Capitania das Artes cultural centre.",
            "full_description": "Nightlife, the Capitania das Artes cultural space and a spectacular sunrise.",
            "audio_description": "You are at Praia dos Artistas. Colourful benches shaped like painter's palettes decorate the promenade. The sea is wilder here, with waves that break into white foam.",
        },
        "es": {
            "name": "Playa dos Artistas",
            "short_description": "Playa urbana tradicional, sede de la Capitania das Artes.",
            "full_description": "Vida nocturna, el Espacio Cultural Capitania das Artes y un amanecer espectacular.",
            "audio_description": "Estás en la Playa dos Artistas. Bancos de colores con forma de paleta de pintor decoran el paseo. El mar es más bravo aquí, con olas que rompen en espuma blanca.",
        },
    },
    "Mirante de Mãe Luiza": {
        "en": {
            "name": "Mãe Luiza Lookout",
            "short_description": "A historic lighthouse with a panoramic view of Natal.",
            "full_description": "A 1951 lighthouse with the best panoramic view of Natal, embracing sea, city and dunes.",
            "audio_description": "You are at the top of the Mãe Luiza Lookout. A 360-degree view: ahead, the endless ocean; to the right, the Via Costeira coastal road; to the left, Morro do Careca; behind you, the city. The wind is strong and salty.",
        },
        "es": {
            "name": "Mirador de Mãe Luiza",
            "short_description": "Un faro histórico con vistas panorámicas de Natal.",
            "full_description": "Un faro de 1951 con la mejor vista panorámica de Natal, que abraza mar, ciudad y dunas.",
            "audio_description": "Estás en lo alto del Mirador de Mãe Luiza. Una vista de 360 grados: al frente, el océano infinito; a la derecha, la Vía Costera; a la izquierda, el Morro do Careca; detrás, la ciudad. El viento es fuerte y salado.",
        },
    },
    "Catedral Nova de Natal": {
        "en": {
            "name": "New Cathedral of Natal",
            "short_description": "A modernist church with a pyramid shape.",
            "full_description": "A modernist landmark of the Northeast, with a unique pyramid shape and colourful stained-glass windows.",
            "audio_description": "You are standing before the New Cathedral of Natal. A monumental pyramid-shaped building, with white walls and stained-glass windows as colourful as fragments of gemstones. Inside, the coloured light creates a mystical atmosphere.",
        },
        "es": {
            "name": "Catedral Nueva de Natal",
            "short_description": "Un templo modernista con forma de pirámide.",
            "full_description": "Un hito modernista del Nordeste, con una forma piramidal única y vidrieras de colores.",
            "audio_description": "Estás ante la Catedral Nueva de Natal. Una construcción piramidal monumental, de paredes blancas y vidrieras de colores como fragmentos de piedras preciosas. En el interior, la luz coloreada crea un ambiente místico.",
        },
    },
    "Café do Forte": {
        "en": {
            "name": "Café do Forte",
            "short_description": "A café with a Braille menu and a sea view.",
            "full_description": "A charming café near the Reis Magos Fortress, with inclusive service.",
            "audio_description": "You are at Café do Forte. The room smells of coffee and tapioca cake. Wooden tables with Braille menus. Through the windows, you can hear the waves breaking.",
        },
        "es": {
            "name": "Café do Forte",
            "short_description": "Una cafetería con carta en braille y vistas al mar.",
            "full_description": "Una cafetería con encanto cerca de la Fortaleza de los Reyes Magos, con atención inclusiva.",
            "audio_description": "Estás en el Café do Forte. El ambiente huele a café y a bizcocho de tapioca. Mesas de madera con cartas en braille. Por las ventanas se puede oír el romper de las olas.",
        },
    },
    "Hotel Parque da Costeira": {
        "en": {
            "name": "Parque da Costeira Hotel",
            "short_description": "A resort hotel with accessible rooms on the Via Costeira.",
            "full_description": "A resort with extensive green areas, swimming pools, direct beach access and fully adapted rooms.",
            "audio_description": "You are at the Parque da Costeira Hotel. A spacious, airy lobby with marble floors. The sound of a fountain echoing. The scent of tropical flowers. Accessible rooms on the ground floor, with a balcony and a sea view.",
        },
        "es": {
            "name": "Hotel Parque da Costeira",
            "short_description": "Un hotel resort con habitaciones accesibles en la Vía Costera.",
            "full_description": "Un resort con amplias zonas verdes, piscinas, acceso directo a la playa y habitaciones totalmente adaptadas.",
            "audio_description": "Estás en el Hotel Parque da Costeira. Un vestíbulo amplio y aireado, con suelo de mármol. El sonido de una fuente que resuena. El aroma de flores tropicales. Habitaciones accesibles en la planta baja, con balcón y vistas al mar.",
        },
    },
}

# Mescla as traduções manuais nos seeds (formato lido por translate_spot).
for _spot in SEED_SPOTS:
    _tr = SPOT_TRANSLATIONS.get(_spot["name"])
    if _tr:
        _spot["translations"] = _tr

SEED_PARTNERS = [
    {"name": "Pousada Inclusiva Ponta Negra", "category": "Hospedagem", "neighborhood": "Ponta Negra",
     "short_description": "Pousada boutique com quartos 100% adaptados a 200m da praia.",
     "accessibility_features": ["Quartos com piso tátil", "Banheiros com barras de apoio", "Recepção 24h com intérprete de Libras", "Cardápio em braille no café"],
     "badges": ["Quartos acessíveis", "Cardápio em braille", "Equipe treinada"],
     "image_url": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
     "email": "reservas@pousadainclusivanatal.com.br", "phone": "+55 84 99888-1234",
     "whatsapp": "+55 84 99888-1234", "price_from": "R$ 280/diária",
     "latitude": -5.8810, "longitude": -35.1680},
    {"name": "Bistrô Sabor & Sentido", "category": "Alimentação", "neighborhood": "Ponta Negra",
     "short_description": "Restaurante com cardápio em braille e pratos audiodescritos.",
     "accessibility_features": ["Cardápio em braille e QR code com audiodescrição", "Mesas adaptadas", "Garçons treinados", "Pratos com texturas distintas"],
     "badges": ["Cardápio em braille", "Audiodescrição"],
     "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
     "email": "contato@saborsentido.com.br", "phone": "+55 84 3219-5678",
     "whatsapp": "+55 84 98877-5544", "price_from": "R$ 65/pessoa",
     "latitude": -5.8825, "longitude": -35.1690},
    {"name": "Buggy Acessível Genipabu", "category": "Passeio", "neighborhood": "Extremoz",
     "short_description": "Passeio de buggy adaptado pelas dunas, com guia em Libras.",
     "accessibility_features": ["Buggy com rampa hidráulica", "Cinto de 4 pontos adaptado", "Guia em Libras e audiodescrição", "Suporte para cadeira anfíbia"],
     "badges": ["Buggy adaptado", "Guia em Libras"],
     "image_url": "https://images.pexels.com/photos/35772295/pexels-photo-35772295.jpeg?w=800&q=80",
     "email": "contato@buggyacessivel.com.br", "phone": "+55 84 99777-2233",
     "whatsapp": "+55 84 99777-2233", "price_from": "R$ 220/buggy",
     "latitude": -5.6700, "longitude": -35.2130},
    {"name": "Hotel Mar & Inclusão", "category": "Hospedagem", "neighborhood": "Praia dos Artistas",
     "short_description": "Hotel histórico reformado, com 12 quartos PCD frente-mar.",
     "accessibility_features": ["Elevador com botões em braille", "Piscina com elevador hidráulico", "Vista descrita por audioguia nos quartos", "Café da manhã com identificação tátil"],
     "badges": ["Quartos acessíveis", "Áudio-guia"],
     "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
     "email": "reservas@marinclusao.com.br", "phone": "+55 84 3344-7788",
     "whatsapp": "+55 84 99555-7788", "price_from": "R$ 320/diária",
     "latitude": -5.7644, "longitude": -35.1856},
    {"name": "Tour Natal Sensorial", "category": "Passeio", "neighborhood": "Centro Histórico",
     "short_description": "City tour guiado pelo Centro Histórico com mediação sensorial.",
     "accessibility_features": ["Guia com audiodescrição", "Maquetes táteis dos monumentos", "Roteiro adaptado para baixa visão", "Mínimo 1, máximo 8 pessoas"],
     "badges": ["Audiodescrição", "Materiais táteis"],
     "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&q=80",
     "email": "agendamento@natalsensorial.com.br", "phone": "+55 84 99222-3344",
     "whatsapp": "+55 84 99222-3344", "price_from": "R$ 180/pessoa",
     "latitude": -5.7811, "longitude": -35.2086},
    {"name": "Cafeteria Aroma & Toque", "category": "Alimentação", "neighborhood": "Tirol",
     "short_description": "Cafeteria com chocolates artesanais e degustação sensorial.",
     "accessibility_features": ["Cardápio em braille", "Degustação às cegas guiada", "Mesa com rebaixamento", "Cães-guia bem-vindos"],
     "badges": ["Pet-guia welcome", "Degustação sensorial"],
     "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
     "email": "ola@aromaetoque.com.br", "phone": "+55 84 3315-9911",
     "whatsapp": "+55 84 99411-9911", "price_from": "R$ 35/pessoa",
     "latitude": -5.7942, "longitude": -35.2017},
]


# Guias reais do cliente. Bio, especialidades, idiomas e contato são placeholders
# neutros — os dados definitivos serão fornecidos pelo cliente e editados no admin.
_GUIDE_PLACEHOLDER_BIO = (
    "Perfil em atualização. Informações sobre formação, especialidades, idiomas e "
    "contato serão adicionadas em breve pelo programa Turismo que se Sente."
)


def _seed_guide(name: str, slug: str):
    return {
        "name": name,
        "photo_url": f"/static/guides/{slug}.jpg",
        "photo_alt": f"Foto de {name}, guia de turismo certificado pelo programa Turismo que se Sente.",
        "short_bio": "Guia certificado pelo programa Turismo que se Sente.",
        "bio": _GUIDE_PLACEHOLDER_BIO,
        "specialties": [],
        "languages": [],
        "certification_course": "Curso Turismo que se Sente - Categoria Ouro (120h)",
        "certification_date": "",
        "accessibility_focus": [],
        "phone": "",
        "whatsapp": "",
        "email": "",
        "instagram": "",
        "region": "Natal/RN",
        "rating": 5.0,
        "years_experience": 0,
        "featured": False,
    }


SEED_GUIDES = [
    _seed_guide("Wallace", "wallace"),
    _seed_guide("Gabriela", "gabriela"),
    _seed_guide("Lilian", "lilian"),
    _seed_guide("Wanessa", "wanessa"),
    _seed_guide("Abrahão", "abrahao"),
]


# ========== AUTH HELPERS ==========
def hash_pwd(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_pwd(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_admin_jwt(admin_id: str, email: str) -> str:
    payload = {
        "sub": admin_id,
        "email": email,
        "role": "admin",
        "type": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MIN),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token admin obrigatório")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, "Sessão expirada")
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Token inválido")
    if payload.get("type") != "admin" or payload.get("role") != "admin":
        raise HTTPException(403, "Acesso restrito a administradores")
    admin = await db.admins.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(401, "Administrador não encontrado")
    return admin


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "").strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            return None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})


async def require_user(authorization: Optional[str] = Header(None)) -> dict:
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(401, "Não autenticado")
    return user


# ========== ROUTES: PUBLIC ==========
@api_router.get("/")
async def root():
    return {"message": "Turismo que se Sente API", "version": "3.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.get("/site-config", response_model=SiteConfig)
async def get_site_config():
    cfg = await db.site_config.find_one({"id": "default"}, {"_id": 0})
    if not cfg:
        cfg = DEFAULT_SITE_CONFIG
    return SiteConfig(**cfg)


# ========== ROUTES: SPOTS ==========
@api_router.get("/spots", response_model=List[TouristSpot])
async def list_spots(category: Optional[str] = None, featured: Optional[bool] = None):
    query: dict = {}
    if category and category.lower() != "todos":
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    spots = await db.spots.find(query, {"_id": 0}).to_list(1000)
    return [TouristSpot(**s) for s in spots]


@api_router.get("/spots/{spot_id}", response_model=TouristSpot)
async def get_spot(spot_id: str):
    spot = await db.spots.find_one({"id": spot_id}, {"_id": 0})
    if not spot:
        raise HTTPException(404, "Spot not found")
    return TouristSpot(**spot)


@api_router.get("/categories")
async def list_categories():
    cats = await db.spots.distinct("category")
    return {"categories": ["Todos"] + sorted(cats)}


# ========== ROUTES: SPOTS - ADMIN PROTECTED ==========
@api_router.post("/spots", response_model=TouristSpot)
async def create_spot(payload: TouristSpotCreate, _admin: dict = Depends(require_admin)):
    spot = TouristSpot(**payload.dict())
    await db.spots.insert_one(spot.dict())
    return spot


@api_router.put("/spots/{spot_id}", response_model=TouristSpot)
async def update_spot(spot_id: str, payload: TouristSpotUpdate, _admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = await db.spots.update_one({"id": spot_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Spot not found")
    # Invalidate cached LLM translations when content changes
    if any(k in update_data for k in ("name", "short_description", "full_description", "audio_description")):
        await db.translations.delete_many({"spot_id": spot_id})
    spot = await db.spots.find_one({"id": spot_id}, {"_id": 0})
    return TouristSpot(**spot)


@api_router.delete("/spots/{spot_id}")
async def delete_spot(spot_id: str, _admin: dict = Depends(require_admin)):
    result = await db.spots.delete_one({"id": spot_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Spot not found")
    await db.translations.delete_many({"spot_id": spot_id})
    return {"deleted": True}


@api_router.post("/seed")
async def seed_database(_admin: dict = Depends(require_admin)):
    await db.spots.delete_many({})
    await db.spots.insert_many([TouristSpot(**s).dict() for s in SEED_SPOTS])
    await db.partners.delete_many({})
    await db.partners.insert_many([Partner(**p).dict() for p in SEED_PARTNERS])
    await db.guides.delete_many({})
    await db.guides.insert_many([Guide(**g).dict() for g in SEED_GUIDES])
    await db.translations.delete_many({})
    return {
        "seeded_spots": len(SEED_SPOTS),
        "seeded_partners": len(SEED_PARTNERS),
        "seeded_guides": len(SEED_GUIDES),
    }


# ========== ROUTES: GUIDES ==========
@api_router.get("/guides", response_model=List[Guide])
async def list_guides(
    specialty: Optional[str] = None,
    language: Optional[str] = None,
    focus: Optional[str] = None,
    featured: Optional[bool] = None,
    active_only: bool = True,
):
    query: dict = {}
    if active_only:
        query["active"] = True
    if specialty and specialty.lower() != "todos":
        query["specialties"] = specialty
    if language:
        query["languages"] = language
    if focus:
        query["accessibility_focus"] = focus
    if featured is not None:
        query["featured"] = featured
    guides = await db.guides.find(query, {"_id": 0}).sort("rating", -1).to_list(1000)
    return [Guide(**g) for g in guides]


@api_router.get("/guides/categories")
async def list_guide_categories():
    specialties = await db.guides.distinct("specialties")
    languages = await db.guides.distinct("languages")
    focus = await db.guides.distinct("accessibility_focus")
    return {
        "specialties": ["Todos"] + sorted([s for s in specialties if s]),
        "languages": sorted([l for l in languages if l]),
        "accessibility_focus": sorted([f for f in focus if f]),
    }


@api_router.get("/guides/{guide_id}", response_model=Guide)
async def get_guide(guide_id: str):
    g = await db.guides.find_one({"id": guide_id}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Guide not found")
    return Guide(**g)


@api_router.get("/guides/{guide_id}/translate", response_model=TranslateResponse)
async def translate_guide(guide_id: str, lang: str = "en"):
    if lang not in ("en", "es", "pt"):
        raise HTTPException(400, "lang must be 'en', 'es' or 'pt'")
    g = await db.guides.find_one({"id": guide_id}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Guide not found")

    if lang == "pt":
        return TranslateResponse(
            language="pt", source="original",
            name=g["name"],
            short_description=g.get("short_bio", ""),
            full_description=g.get("bio", ""),
            audio_description=g.get("bio", ""),
        )

    manual = (g.get("translations") or {}).get(lang) or {}
    if manual.get("bio"):
        return TranslateResponse(
            language=lang, source="manual",
            name=manual.get("name") or g["name"],
            short_description=manual.get("short_bio", g.get("short_bio", "")),
            full_description=manual.get("bio", g.get("bio", "")),
            audio_description=manual.get("bio", g.get("bio", "")),
        )

    cache_key = f"guide:{guide_id}:{lang}"
    cached = await db.translations.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached and cached.get("name"):
        return TranslateResponse(
            language=lang, source="llm",
            name=cached["name"],
            short_description=cached.get("short_description", ""),
            full_description=cached.get("full_description", ""),
            audio_description=cached.get("audio_description", ""),
        )

    target = "English" if lang == "en" else "Spanish (Spain)"
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate-guide-{guide_id}-{lang}",
            system_message=f"You are a professional translator. Translate the Brazilian Portuguese text to natural, fluent {target}. Return ONLY the translation.",
        ).with_model("openai", "gpt-4o-mini")

        async def tx(text: str) -> str:
            if not text:
                return ""
            return (await chat.send_message(UserMessage(text=text))).strip()

        translated = {
            "name": g["name"],  # Names of people stay the same
            "short_description": await tx(g.get("short_bio", "")),
            "full_description": await tx(g.get("bio", "")),
            "audio_description": await tx(g.get("bio", "")),
        }
    except Exception as e:
        logger.error("Guide LLM translation error: %s", e)
        raise HTTPException(503, f"Translation service unavailable: {e}")

    if translated.get("full_description"):
        await db.translations.update_one(
            {"cache_key": cache_key},
            {"$set": {"cache_key": cache_key, "guide_id": guide_id, "language": lang, **translated}},
            upsert=True,
        )
    return TranslateResponse(language=lang, source="llm", **translated)


# ===== GUIDES - ADMIN PROTECTED =====
@api_router.post("/guides", response_model=Guide)
async def create_guide(payload: GuideCreate, _admin: dict = Depends(require_admin)):
    g = Guide(**payload.dict())
    await db.guides.insert_one(g.dict())
    return g


@api_router.put("/guides/{guide_id}", response_model=Guide)
async def update_guide(guide_id: str, payload: GuideUpdate, _admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = await db.guides.update_one({"id": guide_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Guide not found")
    if any(k in update_data for k in ("name", "bio", "short_bio")):
        await db.translations.delete_many({"guide_id": guide_id})
    g = await db.guides.find_one({"id": guide_id}, {"_id": 0})
    return Guide(**g)


@api_router.delete("/guides/{guide_id}")
async def delete_guide(guide_id: str, _admin: dict = Depends(require_admin)):
    result = await db.guides.delete_one({"id": guide_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Guide not found")
    await db.translations.delete_many({"guide_id": guide_id})
    return {"deleted": True}


# ========== ROUTES: TRANSLATION (manual override + LLM fallback) ==========
@api_router.get("/spots/{spot_id}/translate", response_model=TranslateResponse)
async def translate_spot(spot_id: str, lang: str = "en"):
    if lang not in ("en", "es", "pt"):
        raise HTTPException(400, "lang must be 'en', 'es' or 'pt'")
    spot = await db.spots.find_one({"id": spot_id}, {"_id": 0})
    if not spot:
        raise HTTPException(404, "Spot not found")

    if lang == "pt":
        return TranslateResponse(
            language="pt", source="original",
            name=spot["name"], short_description=spot["short_description"],
            full_description=spot["full_description"], audio_description=spot["audio_description"],
        )

    # 1) Manual override from spot.translations
    manual = (spot.get("translations") or {}).get(lang) or {}
    if manual.get("name") and manual.get("audio_description"):
        return TranslateResponse(
            language=lang, source="manual",
            name=manual.get("name") or spot["name"],
            short_description=manual.get("short_description") or spot["short_description"],
            full_description=manual.get("full_description") or spot["full_description"],
            audio_description=manual.get("audio_description") or spot["audio_description"],
        )

    # 2) LLM cache
    cache_key = f"{spot_id}:{lang}"
    cached = await db.translations.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached and cached.get("name") and cached.get("name") != spot["name"]:
        return TranslateResponse(
            language=lang, source="llm",
            name=cached["name"],
            short_description=cached["short_description"],
            full_description=cached["full_description"],
            audio_description=cached["audio_description"],
        )

    # 3) LLM live
    target = "English" if lang == "en" else "Spanish (Spain)"
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate-{spot_id}-{lang}",
            system_message=f"You are a professional translator. Translate the following Brazilian Portuguese text to natural, fluent {target}. Preserve sensory and descriptive details for visually impaired audiences. Return ONLY the translation, no explanations.",
        ).with_model("openai", "gpt-4o-mini")

        async def tx(text: str) -> str:
            if not text:
                return ""
            return (await chat.send_message(UserMessage(text=text))).strip()

        translated = {
            "name": await tx(spot["name"]),
            "short_description": await tx(spot["short_description"]),
            "full_description": await tx(spot["full_description"]),
            "audio_description": await tx(spot["audio_description"]),
        }
    except Exception as e:
        logger.error("LLM translation error: %s", e)
        raise HTTPException(503, f"Translation service unavailable: {e}")

    # Only cache if translation differs from source (sanity)
    if translated["name"] and translated["name"] != spot["name"]:
        await db.translations.update_one(
            {"cache_key": cache_key},
            {"$set": {"cache_key": cache_key, "spot_id": spot_id, "language": lang, **translated}},
            upsert=True,
        )
    return TranslateResponse(language=lang, source="llm", **translated)


# ========== ROUTES: ADMIN AUTH ==========
@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(payload: AdminLogin):
    admin = await db.admins.find_one({"email": payload.email.lower().strip()})
    if not admin or not verify_pwd(payload.password, admin.get("password_hash", "")):
        raise HTTPException(401, "E-mail ou senha incorretos")
    token = create_admin_jwt(admin["id"], admin["email"])
    return AdminToken(
        access_token=token,
        admin={"id": admin["id"], "email": admin["email"], "name": admin.get("name", "Administrador")},
    )


@api_router.get("/admin/me")
async def admin_me(admin: dict = Depends(require_admin)):
    return admin


@api_router.post("/admin/change-password")
async def admin_change_password(
    payload: Dict[str, str],
    admin: dict = Depends(require_admin),
):
    current = payload.get("current_password", "")
    new = payload.get("new_password", "")
    if not new or len(new) < 8:
        raise HTTPException(400, "Nova senha deve ter ao menos 8 caracteres")
    record = await db.admins.find_one({"id": admin["id"]})
    if not record or not verify_pwd(current, record.get("password_hash", "")):
        raise HTTPException(401, "Senha atual incorreta")
    await db.admins.update_one({"id": admin["id"]}, {"$set": {"password_hash": hash_pwd(new)}})
    return {"ok": True}


# ========== ROUTES: SITE CONFIG (admin) ==========
@api_router.put("/admin/site-config", response_model=SiteConfig)
async def update_site_config(payload: SiteConfigUpdate, _admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_config.update_one(
        {"id": "default"},
        {"$set": {"id": "default", **update_data}},
        upsert=True,
    )
    cfg = await db.site_config.find_one({"id": "default"}, {"_id": 0})
    return SiteConfig(**cfg)


@api_router.get("/admin/inquiries")
async def admin_list_inquiries(_admin: dict = Depends(require_admin)):
    items = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ========== ROUTES: IMAGE UPLOAD (admin) ==========
@api_router.post("/admin/upload-image")
async def upload_image(payload: ImageUpload, _admin: dict = Depends(require_admin)):
    """Decode a base64 image and upload it to Cloudinary, returning the secure_url."""
    raw = (payload.base64 or "").strip()
    if not raw:
        raise HTTPException(400, "Imagem vazia")

    # Accept both bare base64 and data URIs ("data:image/png;base64,....")
    mime = "image/jpeg"
    if raw.startswith("data:"):
        header, _, b64data = raw.partition(",")
        if not b64data:
            raise HTTPException(400, "Data URI inválido")
        if ";base64" in header:
            mime = header[len("data:"):].split(";", 1)[0] or mime
    else:
        b64data = raw

    try:
        binary = base64.b64decode(b64data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Conteúdo base64 inválido")
    if not binary:
        raise HTTPException(400, "Imagem vazia")

    if not cloudinary_configured():
        raise HTTPException(503, "Serviço de imagens (Cloudinary) não configurado")

    img_id = str(uuid.uuid4())
    # Cloudinary's SDK is synchronous; run it off the event loop.
    try:
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            io.BytesIO(binary),
            resource_type="image",
            folder=CLOUDINARY_UPLOAD_FOLDER,
            public_id=img_id,
            overwrite=True,
        )
    except Exception as e:
        logger.error("Cloudinary upload failed: %s", e)
        raise HTTPException(502, f"Falha ao enviar imagem para o Cloudinary: {e}")

    secure_url = result.get("secure_url")
    if not secure_url:
        raise HTTPException(502, "Cloudinary não retornou uma URL segura")

    # Keep lightweight metadata (no base64 blob) for record-keeping
    await db.images.insert_one({
        "id": img_id,
        "image_url": secure_url,
        "public_id": result.get("public_id"),
        "mime": mime,
        "alt": payload.alt or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"id": img_id, "image_url": secure_url, "alt": payload.alt}


# ========== ROUTES: TOURIST AUTH ==========
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest):
    if not payload.session_token:
        raise HTTPException(400, "session_token required")
    async with httpx.AsyncClient(timeout=10.0) as http:
        try:
            r = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_token},
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            logger.error("Emergent auth verify failed: %s", e)
            raise HTTPException(401, "Invalid session token")

    email = data.get("email")
    if not email:
        raise HTTPException(401, "Email missing from session")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name", "")),
                      "picture": data.get("picture", existing.get("picture", ""))}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        u = User(user_id=user_id, email=email, name=data.get("name", ""), picture=data.get("picture", ""))
        await db.users.insert_one(u.dict())

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": payload.session_token},
        {"$set": {"session_token": payload.session_token, "user_id": user_id,
                  "expires_at": expires_at, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": payload.session_token, "user": user}


@api_router.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": True}
    token = authorization.replace("Bearer ", "").strip()
    await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ========== ROUTES: FAVORITES ==========
@api_router.get("/me/favorites")
async def get_favorites(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return {"favorites": user.get("favorites", [])}


@api_router.post("/me/favorites/{spot_id}")
async def add_favorite(spot_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    await db.users.update_one({"user_id": user["user_id"]}, {"$addToSet": {"favorites": spot_id}})
    return {"ok": True}


@api_router.delete("/me/favorites/{spot_id}")
async def remove_favorite(spot_id: str, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    await db.users.update_one({"user_id": user["user_id"]}, {"$pull": {"favorites": spot_id}})
    return {"ok": True}


@api_router.patch("/me/language")
async def update_language(payload: Dict[str, str], authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    lang = payload.get("language", "pt")
    if lang not in ("pt", "en", "es"):
        raise HTTPException(400, "invalid language")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"language": lang}})
    return {"ok": True, "language": lang}


# ========== ROUTES: PARTNERS / MARKETPLACE ==========
@api_router.get("/partners", response_model=List[Partner])
async def list_partners(category: Optional[str] = None):
    query: dict = {}
    if category and category.lower() != "todos":
        query["category"] = category
    partners = await db.partners.find(query, {"_id": 0}).to_list(1000)
    return [Partner(**p) for p in partners]


@api_router.get("/partners/{partner_id}", response_model=Partner)
async def get_partner(partner_id: str):
    p = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Partner not found")
    return Partner(**p)


# ===== PARTNERS - ADMIN PROTECTED =====
@api_router.post("/partners", response_model=Partner)
async def create_partner(payload: PartnerCreate, _admin: dict = Depends(require_admin)):
    p = Partner(**payload.dict())
    await db.partners.insert_one(p.dict())
    return p


@api_router.put("/partners/{partner_id}", response_model=Partner)
async def update_partner(partner_id: str, payload: PartnerUpdate, _admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Partner not found")
    p = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    return Partner(**p)


@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str, _admin: dict = Depends(require_admin)):
    result = await db.partners.delete_one({"id": partner_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Partner not found")
    return {"deleted": True}


@api_router.get("/seal/verify/{code}")
async def verify_seal(code: str):
    p = await db.partners.find_one({"seal_code": code.upper()}, {"_id": 0})
    if not p:
        return {"valid": False, "message": "Selo não reconhecido."}
    return {
        "valid": True,
        "partner": {
            "id": p["id"], "name": p["name"], "category": p["category"],
            "badges": p.get("badges", []), "issued_at": p.get("created_at"),
        },
        "message": f"Selo verificado: {p['name']} é um parceiro certificado.",
    }


@api_router.post("/inquiries", response_model=Inquiry)
async def create_inquiry(payload: InquiryCreate, authorization: Optional[str] = Header(None)):
    if not payload.partner_id and not payload.guide_id:
        raise HTTPException(400, "partner_id or guide_id is required")
    target_name = ""
    if payload.partner_id:
        partner = await db.partners.find_one({"id": payload.partner_id}, {"_id": 0})
        if not partner:
            raise HTTPException(404, "Partner not found")
        target_name = f"partner {partner['name']}"
    if payload.guide_id:
        guide = await db.guides.find_one({"id": payload.guide_id}, {"_id": 0})
        if not guide:
            raise HTTPException(404, "Guide not found")
        target_name = f"guide {guide['name']}"
    user = await get_current_user(authorization)
    inq = Inquiry(**payload.dict(), user_id=(user["user_id"] if user else None))
    await db.inquiries.insert_one(inq.dict())
    logger.info("Inquiry %s for %s from %s", inq.id, target_name, inq.email)
    return inq


# ========== STARTUP ==========
@app.on_event("startup")
async def startup_indexes_and_seed():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.partners.create_index("seal_code", unique=True)
        await db.admins.create_index("email", unique=True)
        await db.spots.create_index("id", unique=True)
    except Exception as e:
        logger.warning("Index creation: %s", e)

    # Seed spots
    if await db.spots.count_documents({}) == 0:
        await db.spots.insert_many([TouristSpot(**s).dict() for s in SEED_SPOTS])
        logger.info("Seeded %d spots", len(SEED_SPOTS))
    # Seed partners
    if await db.partners.count_documents({}) == 0:
        await db.partners.insert_many([Partner(**p).dict() for p in SEED_PARTNERS])
        logger.info("Seeded %d partners", len(SEED_PARTNERS))
    # Seed guides
    if await db.guides.count_documents({}) == 0:
        await db.guides.insert_many([Guide(**g).dict() for g in SEED_GUIDES])
        logger.info("Seeded %d guides", len(SEED_GUIDES))
    # Seed default admin
    if await db.admins.count_documents({}) == 0:
        admin_doc = {
            "id": f"admin_{uuid.uuid4().hex[:12]}",
            "email": DEFAULT_ADMIN_EMAIL,
            "name": "Administrador",
            "password_hash": hash_pwd(DEFAULT_ADMIN_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.admins.insert_one(admin_doc)
        logger.info("Seeded default admin: %s", DEFAULT_ADMIN_EMAIL)
    # Seed/migrate site config
    if await db.site_config.count_documents({}) == 0:
        await db.site_config.insert_one(dict(DEFAULT_SITE_CONFIG))
        logger.info("Seeded default site config")
    else:
        existing = await db.site_config.find_one({"id": "default"}) or {}
        # Migrate: replace any old Emergent-hosted brand images (logo + seal)
        # with the locally-served versions so we no longer depend on Emergent.
        OLD_BRAND_URLS = {OLD_EMERGENT_LOGO, OLD_EMERGENT_SEAL}
        updates: dict = {}
        if existing.get("seal_image_url") in OLD_BRAND_URLS:
            updates["seal_image_url"] = DEFAULT_SITE_CONFIG["seal_image_url"]
            updates["seal_alt"] = DEFAULT_SITE_CONFIG["seal_alt"]
        if existing.get("app_logo_url") in OLD_BRAND_URLS:
            updates["app_logo_url"] = DEFAULT_SITE_CONFIG["app_logo_url"]
        if existing.get("app_icon_url") in OLD_BRAND_URLS:
            updates["app_icon_url"] = DEFAULT_SITE_CONFIG["app_icon_url"]
        # Set defaults for fields that didn't exist before (only if missing)
        for new_key in ("app_name", "app_logo_url", "app_icon_url", "hero_image_url",
                        "about_pt", "about_en", "about_es",
                        "mission_pt", "mission_en", "mission_es",
                        "vision_pt", "vision_en", "vision_es",
                        "contact_email", "contact_phone", "contact_whatsapp", "contact_address",
                        "instagram", "facebook", "youtube", "tiktok", "website",
                        "promoter_logos", "promoter_names",
                        "emergency_police", "emergency_ambulance", "emergency_fire",
                        "emergency_tourist", "show_guides_tab", "show_marketplace_tab",
                        "show_about_tab"):
            if new_key not in existing or existing.get(new_key) in (None, "", []):
                if isinstance(DEFAULT_SITE_CONFIG[new_key], bool) and new_key in existing:
                    continue
                updates[new_key] = DEFAULT_SITE_CONFIG[new_key]
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.site_config.update_one({"id": "default"}, {"$set": updates})
            logger.info("Migrated site_config: %s", list(updates.keys()))
    # Purge bad translation cache from previous iteration (gpt-5.4-mini bug)
    await db.translations.delete_many({})
    logger.info("Cleared translations cache (forces fresh LLM with gpt-4o-mini)")


app.include_router(api_router)

# Serve uploaded images (and any other static asset) from backend/static
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
