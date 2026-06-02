"""
Turismo que se Sente - Backend API
Accessible tourism guide for Natal, RN (Brazil).
"""
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Turismo que se Sente API")
api_router = APIRouter(prefix="/api")


# ========== MODELS ==========
class TouristSpot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # "Praia", "História e Cultura", "Parque", "Cafeteria", "Hotel", "Mirante"
    neighborhood: str
    address: str
    short_description: str
    full_description: str
    audio_description: str  # Text used for TTS
    image_url: str
    accessibility_badges: List[str] = []  # e.g. ["Acessível", "Banheiro acessível", "Piso tátil"]
    accessibility_features: List[str] = []  # bullet list
    distance_km: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    featured: bool = False
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
    accessibility_badges: List[str] = []
    accessibility_features: List[str] = []
    distance_km: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    featured: bool = False


class TouristSpotUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    neighborhood: Optional[str] = None
    address: Optional[str] = None
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    audio_description: Optional[str] = None
    image_url: Optional[str] = None
    accessibility_badges: Optional[List[str]] = None
    accessibility_features: Optional[List[str]] = None
    distance_km: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    featured: Optional[bool] = None


# ========== SEED DATA ==========
SEED_SPOTS = [
    {
        "name": "Morro do Careca",
        "category": "Praia",
        "neighborhood": "Ponta Negra",
        "address": "Av. Erivan França, Ponta Negra, Natal - RN",
        "short_description": "Cartão-postal de Natal, duna de 120m rodeada de Mata Atlântica.",
        "full_description": "O Morro do Careca é o símbolo turístico de Natal: uma duna de cerca de 120 metros de altura, cercada pela Mata Atlântica e banhada pelo mar azul-turquesa de Ponta Negra. Diariamente recebe centenas de visitantes que apreciam o pôr do sol e a brisa do mar.",
        "audio_description": "Você está em frente ao Morro do Careca, o cartão-postal de Natal. Imagine uma imensa duna de areia clara, com cerca de cento e vinte metros de altura, que se ergue diretamente da praia. Em suas laterais, vegetação verde de Mata Atlântica forma um contraste com a areia dourada. À sua frente, o oceano Atlântico se estende em tons de azul-turquesa, com ondas suaves que quebram na orla. O som constante das ondas, o cheiro salgado do mar e a brisa morna no rosto fazem deste o local mais sensorial de Natal.",
        "image_url": "https://images.pexels.com/photos/2832042/pexels-photo-2832042.jpeg?w=1200&q=80",
        "accessibility_badges": ["Acessível", "Banheiro acessível", "Piso tátil"],
        "accessibility_features": [
            "Rampa de acesso na orla de Ponta Negra",
            "Banheiro acessível na praia",
            "Vagas reservadas próximas ao calçadão",
            "Piso tátil em parte do percurso",
            "Acompanhamento recomendado na trilha de acesso"
        ],
        "distance_km": 0.2, "latitude": -5.8819, "longitude": -35.1664, "featured": True,
    },
    {
        "name": "Forte dos Reis Magos",
        "category": "História e Cultura",
        "neighborhood": "Praia do Forte",
        "address": "Praia do Forte, s/n, Natal - RN",
        "short_description": "Construção mais antiga do RN, erguida em 1598 à beira-mar.",
        "full_description": "Erguida em 1598 para proteger a cidade de invasões, a Fortaleza dos Reis Magos é a construção mais antiga do Rio Grande do Norte. Em formato de estrela de cinco pontas, fica localizada na entrada da Baía da Formosa, com vista privilegiada para o encontro do Rio Potengi com o Oceano Atlântico.",
        "audio_description": "Você está diante da Fortaleza dos Reis Magos, construída em 1598. Imagine uma imponente edificação em pedra calcária, com paredes grossas e amareladas pelo tempo, em formato de estrela de cinco pontas. Ela se ergue sobre um banco de arenito à beira-mar. À sua frente, o Oceano Atlântico se encontra com o Rio Potengi, criando ondas turbulentas. Canhões antigos apontam para o horizonte, lembrando da época colonial. Você pode sentir o vento salgado, ouvir o quebrar das ondas contra as muralhas e tocar as paredes ásperas e seculares da fortaleza.",
        "image_url": "https://images.unsplash.com/photo-1704797390682-76479a29dc9a?w=1200&q=80",
        "accessibility_badges": ["Acessível", "Audioguia"],
        "accessibility_features": [
            "Acesso por rampa na entrada principal",
            "Visita guiada com audiodescrição",
            "Estacionamento próximo",
            "Apoio de guia treinado em sensorialidade"
        ],
        "distance_km": 3.2, "latitude": -5.7548, "longitude": -35.1916, "featured": True,
    },
    {
        "name": "Praia de Ponta Negra",
        "category": "Praia",
        "neighborhood": "Ponta Negra",
        "address": "Av. Erivan França, Ponta Negra, Natal - RN",
        "short_description": "A praia mais famosa de Natal, com calçadão e bares.",
        "full_description": "Ponta Negra é a praia urbana mais famosa de Natal, com mais de 4km de extensão. Possui um calçadão movimentado com quiosques, restaurantes, hotéis e o Morro do Careca ao fundo. Águas mornas e calmas, ideal para banho.",
        "audio_description": "Você está na Praia de Ponta Negra. Imagine uma vasta faixa de areia clara e fina que se estende por quatro quilômetros, com águas mornas e tranquilas em tons de verde e azul. O calçadão de pedras portuguesas, em ondas brancas e pretas, segue paralelo ao mar. Quiosques coloridos vendem água de coco, e o cheiro de tapioca e camarão frito vem dos restaurantes próximos. Ao fundo, à direita, o imponente Morro do Careca encerra a paisagem. O vento constante traz a brisa salgada do mar e o som das vozes alegres dos banhistas.",
        "image_url": "https://images.pexels.com/photos/36186542/pexels-photo-36186542.jpeg?w=1200&q=80",
        "accessibility_badges": ["Acessível", "Cadeira anfíbia"],
        "accessibility_features": [
            "Cadeiras anfíbias disponíveis nos postos salva-vidas",
            "Calçadão totalmente acessível",
            "Banheiros adaptados nos quiosques principais",
            "Faixas de areia compactada para acesso à água"
        ],
        "distance_km": 0.5, "latitude": -5.8800, "longitude": -35.1700, "featured": True,
    },
    {
        "name": "Parque das Dunas",
        "category": "Parque",
        "neighborhood": "Tirol",
        "address": "Av. Alexandrino de Alencar, s/n, Tirol, Natal - RN",
        "short_description": "Segunda maior reserva urbana de Mata Atlântica do Brasil.",
        "full_description": "O Parque das Dunas é a segunda maior reserva urbana de Mata Atlântica do Brasil, com 1.172 hectares de área verde. Possui trilhas ecológicas, anfiteatro ao ar livre e uma rica biodiversidade.",
        "audio_description": "Você está na entrada do Parque das Dunas. Ao seu redor, uma densa Mata Atlântica forma um teto verde sobre trilhas de areia. O ar é fresco e úmido, com aromas de folhas e flores tropicais. Você ouve o canto de pássaros como o sabiá-laranjeira, e o farfalhar das folhas ao vento. Dunas de areia branca emergem da vegetação em alguns trechos. Há trilhas planas e acessíveis, com guias treinados para explicar a flora e fauna local através do toque em folhas, cascas de árvores e da escuta dos sons da natureza.",
        "image_url": "https://images.unsplash.com/photo-1473445730015-841f29a9490b?w=1200&q=80",
        "accessibility_badges": ["Acessível", "Trilhas acessíveis"],
        "accessibility_features": [
            "Trilha Peroba adaptada para cadeirantes",
            "Guias treinados em audiodescrição",
            "Mapa tátil na entrada",
            "Banheiros adaptados"
        ],
        "distance_km": 4.1, "latitude": -5.8367, "longitude": -35.1947, "featured": True,
    },
    {
        "name": "Dunas de Genipabu",
        "category": "Praia",
        "neighborhood": "Extremoz",
        "address": "Genipabu, Extremoz - RN (20km de Natal)",
        "short_description": "Dunas móveis com passeio de buggy e dromedários.",
        "full_description": "Genipabu é o cenário de dunas móveis mais famoso do Brasil, com lagoa de águas doces, passeios de buggy e até dromedários. Faz parte de uma APA estadual.",
        "audio_description": "Você está nas Dunas de Genipabu. Imagine um vasto deserto de areia clara, com dunas que sobem e descem como ondas gigantes. O sol forte aquece a areia macia sob seus pés. Há uma lagoa de águas escuras e cristalinas no meio das dunas, onde é possível se refrescar. Você pode ouvir o vento que carrega grãos de areia, formando pequenos redemoinhos. Buggies aceleram pelas dunas com gritos animados, e dromedários se movem lentamente conduzidos por guias.",
        "image_url": "https://images.pexels.com/photos/35772295/pexels-photo-35772295.jpeg?w=1200&q=80",
        "accessibility_badges": ["Buggy adaptado"],
        "accessibility_features": [
            "Buggy adaptado disponível mediante agendamento",
            "Apoio para embarque na lagoa",
            "Guias com experiência em turismo inclusivo"
        ],
        "distance_km": 20.0, "latitude": -5.6694, "longitude": -35.2128, "featured": True,
    },
    {
        "name": "Praia da Pipa",
        "category": "Praia",
        "neighborhood": "Tibau do Sul",
        "address": "Tibau do Sul - RN (85km de Natal)",
        "short_description": "Praia paradisíaca com falésias e golfinhos.",
        "full_description": "A Praia da Pipa é uma das mais belas do Brasil, com falésias coloridas, golfinhos que se aproximam dos banhistas e uma vila charmosa.",
        "audio_description": "Você está na Praia da Pipa. Imagine falésias verticais em tons de vermelho, laranja e branco, que se erguem ao fundo da areia. O mar verde-esmeralda é morno e calmo. Em determinadas horas do dia, golfinhos se aproximam da praia e podem ser ouvidos respirando próximos à areia. O som das ondas, o cheiro salgado e o calor do sol completam a experiência sensorial.",
        "image_url": "https://images.pexels.com/photos/18336311/pexels-photo-18336311.jpeg?w=1200&q=80",
        "accessibility_badges": ["Parcialmente acessível"],
        "accessibility_features": [
            "Cadeira anfíbia disponível na Praia do Centro",
            "Pousadas com quartos adaptados na vila",
            "Restaurantes com cardápios em braille"
        ],
        "distance_km": 85.0, "latitude": -6.2295, "longitude": -35.0469, "featured": True,
    },
    {
        "name": "Maracajaú",
        "category": "Praia",
        "neighborhood": "Maxaranguape",
        "address": "Maracajaú, Maxaranguape - RN (50km de Natal)",
        "short_description": "Parrachos com piscinas naturais e mergulho.",
        "full_description": "Os Parrachos de Maracajaú formam o 'Caribe brasileiro': piscinas naturais a 7km da costa, com águas cristalinas e peixes coloridos.",
        "audio_description": "Você está em Maracajaú. Imagine uma praia de areia branca onde catamarãs partem rumo aos parrachos: bancos de coral que formam piscinas naturais a sete quilômetros da costa. A água é morna, transparente, em tons de azul-piscina. Peixes coloridos nadam entre seus pés. O som dos remos, o cheiro do mar e o sol intenso completam a experiência.",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
        "accessibility_badges": ["Embarcação adaptada"],
        "accessibility_features": [
            "Catamarã com rampa de acesso",
            "Coletes salva-vidas adaptados",
            "Equipe treinada em snorkel inclusivo"
        ],
        "distance_km": 50.0, "latitude": -5.4083, "longitude": -35.2547, "featured": False,
    },
    {
        "name": "Centro Histórico - Cidade Alta",
        "category": "História e Cultura",
        "neighborhood": "Cidade Alta",
        "address": "Cidade Alta, Natal - RN",
        "short_description": "Bairro mais antigo de Natal, com igrejas e museus.",
        "full_description": "A Cidade Alta é o bairro fundador de Natal. Aqui estão a Igreja Matriz, o Memorial Câmara Cascudo, o Beco da Lama e construções coloniais dos séculos 16 a 19.",
        "audio_description": "Você está no Centro Histórico de Natal, a Cidade Alta. Imagine ruas estreitas calçadas em pedras irregulares, com casarões coloniais pintados em cores vivas: amarelo, rosa, azul. A Igreja Matriz, de fachada branca e cinza, domina a praça André de Albuquerque. Você ouve sinos, o burburinho de comerciantes e o vento que carrega aromas de café fresco e bolo de macaxeira.",
        "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&q=80",
        "accessibility_badges": ["Audioguia"],
        "accessibility_features": [
            "Tour guiado com audiodescrição",
            "Mapas táteis no Memorial Câmara Cascudo",
            "Rota acessível entre os principais pontos"
        ],
        "distance_km": 5.5, "latitude": -5.7811, "longitude": -35.2086, "featured": False,
    },
    {
        "name": "Praia do Meio",
        "category": "Praia",
        "neighborhood": "Praia do Meio",
        "address": "Av. Pres. Café Filho, Praia do Meio, Natal - RN",
        "short_description": "Praia urbana com calçadão e barracas.",
        "full_description": "A Praia do Meio fica entre a Praia do Forte e a Praia dos Artistas. Possui um calçadão arborizado e barracas com música ao vivo.",
        "audio_description": "Você está na Praia do Meio. O calçadão é amplo, com bancos sombreados por coqueiros. O mar é forte aqui, com ondas que rugem ao bater na areia. Barracas de praia servem peixe frito e cerveja gelada, e em alguns dias há música de forró ao vivo.",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
        "accessibility_badges": ["Calçadão acessível"],
        "accessibility_features": [
            "Calçadão plano e acessível",
            "Barracas com banheiros adaptados",
            "Estacionamento com vagas reservadas"
        ],
        "distance_km": 2.8, "latitude": -5.7700, "longitude": -35.1900, "featured": False,
    },
    {
        "name": "Praia dos Artistas",
        "category": "Praia",
        "neighborhood": "Areia Preta",
        "address": "Av. Pres. Café Filho, Areia Preta, Natal - RN",
        "short_description": "Tradicional praia urbana com a Capitania das Artes.",
        "full_description": "A Praia dos Artistas é conhecida pela vida noturna, pelo Espaço Cultural Capitania das Artes e por uma das melhores vistas do nascer do sol em Natal.",
        "audio_description": "Você está na Praia dos Artistas. Bancos coloridos em formato de paleta de pintor decoram o calçadão. O mar é mais bravo aqui, com ondas que se quebram em espuma branca. À noite, luzes amareladas iluminam a orla e o som do reggae sai dos bares próximos.",
        "image_url": "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200&q=80",
        "accessibility_badges": ["Parcialmente acessível"],
        "accessibility_features": [
            "Calçadão acessível",
            "Espaço cultural com elevador",
            "Banheiros adaptados próximos"
        ],
        "distance_km": 3.5, "latitude": -5.7644, "longitude": -35.1856, "featured": False,
    },
    {
        "name": "Mirante de Mãe Luiza",
        "category": "Mirante",
        "neighborhood": "Mãe Luiza",
        "address": "Rua Açu, Mãe Luiza, Natal - RN",
        "short_description": "Farol histórico com vista panorâmica de Natal.",
        "full_description": "O Farol de Mãe Luiza, construído em 1951, oferece a melhor vista panorâmica de Natal, abraçando o mar, a cidade e as dunas.",
        "audio_description": "Você está no alto do Mirante de Mãe Luiza. À sua volta, uma vista de 360 graus: à frente, o oceano azul infinito; à direita, a praia de Areia Preta e a Via Costeira; à esquerda, o Morro do Careca; e atrás, a cidade de Natal com seus prédios brancos. O vento é forte aqui, com cheiro de mar misturado ao aroma da vegetação rasteira das dunas.",
        "image_url": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80",
        "accessibility_badges": ["Acessível"],
        "accessibility_features": [
            "Estacionamento próximo",
            "Acesso por rampa ao mirante",
            "Vista descrita por placas em braille"
        ],
        "distance_km": 4.0, "latitude": -5.7872, "longitude": -35.1872, "featured": False,
    },
    {
        "name": "Catedral Nova de Natal",
        "category": "História e Cultura",
        "neighborhood": "Tirol",
        "address": "Praça Pio X, Tirol, Natal - RN",
        "short_description": "Templo modernista em formato de pirâmide.",
        "full_description": "A Catedral Metropolitana de Natal é um marco da arquitetura modernista do Nordeste, com formato piramidal único e vitrais coloridos.",
        "audio_description": "Você está diante da Catedral Nova de Natal. Imagine uma construção piramidal monumental, com paredes brancas e vitrais coloridos que parecem fragmentos de gemas. No interior, a luz colorida dos vitrais cria um ambiente místico. O eco dos passos sobre o piso de mármore, o som distante de orações e o aroma sutil de incenso completam a atmosfera sagrada.",
        "image_url": "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=1200&q=80",
        "accessibility_badges": ["Acessível"],
        "accessibility_features": [
            "Rampa de acesso na entrada principal",
            "Bancos reservados próximos ao altar",
            "Audioguia disponível na sacristia"
        ],
        "distance_km": 5.0, "latitude": -5.7942, "longitude": -35.2017, "featured": False,
    },
    {
        "name": "Café do Forte",
        "category": "Cafeteria",
        "neighborhood": "Praia do Forte",
        "address": "Próximo ao Forte dos Reis Magos, Natal - RN",
        "short_description": "Cafeteria com cardápio em braille e vista para o mar.",
        "full_description": "O Café do Forte é uma cafeteria charmosa próxima à Fortaleza dos Reis Magos, conhecida pelo atendimento inclusivo, cardápio em braille e doces regionais.",
        "audio_description": "Você está no Café do Forte. O ambiente cheira a café recém-passado e bolo de tapioca. As mesas de madeira têm cardápios em braille. Pelas janelas amplas, é possível ouvir o quebrar das ondas. O atendente lhe entrega um docinho de leite com castanha, ainda morno.",
        "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
        "accessibility_badges": ["Cardápio em braille", "Acessível"],
        "accessibility_features": [
            "Cardápio em braille",
            "Mesas adaptadas para cadeirantes",
            "Atendentes treinados em inclusão"
        ],
        "distance_km": 2.9, "latitude": -5.7542, "longitude": -35.1922, "featured": False,
    },
    {
        "name": "Hotel Parque da Costeira",
        "category": "Hotel",
        "neighborhood": "Ponta Negra",
        "address": "Av. Senador Dinarte Mariz, Via Costeira, Natal - RN",
        "short_description": "Hotel resort com quartos acessíveis na Via Costeira.",
        "full_description": "Hotel resort com extensa área verde, piscinas, acesso direto à praia e quartos totalmente adaptados.",
        "audio_description": "Você está no Hotel Parque da Costeira. O lobby é amplo e arejado, com piso de mármore polido. O som de uma fonte de água ecoa no ambiente. O ar tem o aroma de flores tropicais. Os quartos acessíveis ficam no térreo, com varanda e vista para o mar.",
        "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
        "accessibility_badges": ["Quartos acessíveis"],
        "accessibility_features": [
            "Quartos com banheiros adaptados",
            "Piscina com elevador hidráulico",
            "Cardápio em braille no restaurante",
            "Equipe treinada em libras"
        ],
        "distance_km": 5.0, "latitude": -5.8500, "longitude": -35.1850, "featured": False,
    },
]


# ========== ROUTES ==========
@api_router.get("/")
async def root():
    return {"message": "Turismo que se Sente API", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.post("/seed")
async def seed_database():
    """Seed the database with initial tourist spots. Idempotent."""
    await db.spots.delete_many({})
    spots = [TouristSpot(**spot).dict() for spot in SEED_SPOTS]
    if spots:
        await db.spots.insert_many(spots)
    return {"seeded": len(spots)}


@api_router.get("/spots", response_model=List[TouristSpot])
async def list_spots(category: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
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


@api_router.post("/spots", response_model=TouristSpot)
async def create_spot(payload: TouristSpotCreate):
    spot = TouristSpot(**payload.dict())
    await db.spots.insert_one(spot.dict())
    return spot


@api_router.put("/spots/{spot_id}", response_model=TouristSpot)
async def update_spot(spot_id: str, payload: TouristSpotUpdate):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = await db.spots.update_one({"id": spot_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Spot not found")
    spot = await db.spots.find_one({"id": spot_id}, {"_id": 0})
    return TouristSpot(**spot)


@api_router.delete("/spots/{spot_id}")
async def delete_spot(spot_id: str):
    result = await db.spots.delete_one({"id": spot_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Spot not found")
    return {"deleted": True}


@api_router.get("/categories")
async def list_categories():
    cats = await db.spots.distinct("category")
    return {"categories": ["Todos"] + sorted(cats)}


# Auto-seed on startup if empty
@app.on_event("startup")
async def startup_seed():
    count = await db.spots.count_documents({})
    if count == 0:
        spots = [TouristSpot(**s).dict() for s in SEED_SPOTS]
        await db.spots.insert_many(spots)
        logging.info(f"Seeded {len(spots)} tourist spots")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
