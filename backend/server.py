# Import hlavní FastAPI aplikace, routeru pro skupinování endpointů
# a HTTPException pro vracení chybových odpovědí
from fastapi import FastAPI, APIRouter, HTTPException

# Načtení proměnných prostředí ze souboru .env
from dotenv import load_dotenv

# Middleware pro povolení CORS (komunikace frontendu s backendem z jiné domény)
from starlette.middleware.cors import CORSMiddleware

# Asynchronní MongoDB klient
from motor.motor_asyncio import AsyncIOMotorClient

# Práce s proměnnými prostředí
import os

# Logování chyb a informací
import logging

# Práce s cestami v souborovém systému
from pathlib import Path

# Pydantic modely pro validaci dat
from pydantic import BaseModel, Field, ConfigDict

# Typové anotace
from typing import List, Optional, Dict, Any

# Generování unikátních ID
import uuid

# Práce s datem a časem v UTC
from datetime import datetime, timezone

# Klient pro komunikaci s Groq API (AI chat)
from groq import Groq


# ROOT_DIR = složka, ve které leží tento Python soubor
ROOT_DIR = Path(__file__).parent

# Načte proměnné prostředí ze souboru .env umístěného vedle tohoto souboru
load_dotenv(ROOT_DIR / '.env')


# Načtení URL adresy MongoDB z proměnných prostředí
mongo_url = os.environ['MONGO_URL']

# Vytvoření MongoDB klienta
client = AsyncIOMotorClient(mongo_url)

# Výběr databáze podle názvu z proměnné prostředí DB_NAME
db = client[os.environ['DB_NAME']]


# Vytvoření hlavní FastAPI aplikace
app = FastAPI()

# Vytvoření routeru se společným prefixem /api
# Všechny endpointy níže budou začínat /api/...
api_router = APIRouter(prefix="/api")

# Inicializace Groq klienta s API klíčem
# Pokud klíč chybí, použije se prázdný string
groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY', ''))


# =========================================================
# Pydantic modely - definují strukturu dat
# =========================================================

class Product(BaseModel):
    # Ignoruje neznámá pole navíc, která by přišla v datech
    model_config = ConfigDict(extra="ignore")

    # Unikátní ID produktu, automaticky se vytvoří UUID jako string
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # Název produktu
    name: str

    # Popis produktu
    description: str

    # Cena produktu
    price: float

    # Kategorie produktu
    category: str

    # Hlavní obrázek produktu (volitelný)
    image: Optional[str] = None

    # Seznam obrázků produktu
    images: List[str] = []

    # Dostupné velikosti
    sizes: List[str] = ["S", "M", "L", "XL"]

    # Dostupné barvy
    colors: List[str] = ["Black", "White"]

    # Překlady produktu, např. podle jazyka
    # struktura může být třeba:
    # {
    #   "cs": {"name": "...", "description": "..."},
    #   "en": {"name": "...", "description": "..."}
    # }
    translations: Optional[Dict[str, Dict[str, str]]] = None

    # Datum vytvoření produktu, automaticky v UTC
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    # Model pro vytvoření / update produktu
    # Nemá id ani created_at, protože ty se řeší na backendu
    name: str
    description: str
    price: float
    category: str
    image: Optional[str] = None
    images: List[str] = []
    sizes: List[str] = ["S", "M", "L", "XL"]
    colors: List[str] = ["Black", "White"]
    translations: Optional[Dict[str, Dict[str, str]]] = None


class CartItem(BaseModel):
    # ID produktu v košíku
    product_id: str

    # Počet kusů
    quantity: int

    # Vybraná velikost
    size: str

    # Vybraná barva
    color: str


class CartUpdate(BaseModel):
    # Celý obsah košíku jako seznam položek
    items: List[CartItem]


class CartResponse(BaseModel):
    # Session ID uživatele / návštěvníka
    session_id: str

    # Položky košíku
    items: List[Dict[str, Any]]

    # Celková cena košíku
    total: float


class ChatMessage(BaseModel):
    # Session ID klienta
    session_id: str

    # Zpráva od uživatele
    message: str


class ChatResponse(BaseModel):
    # Odpověď AI asistenta
    response: str

    # Session ID klienta
    session_id: str


# =========================================================
# Základní endpoint
# =========================================================

@api_router.get("/")
async def root():
    # Jednoduchý testovací endpoint
    return {"message": "SIERRA 97 SX API"}


# =========================================================
# Produkty
# =========================================================

@api_router.get("/products", response_model=List[Dict[str, Any]])
async def get_products(category: Optional[str] = None):
    # Pokud není zadaná kategorie nebo je "All",
    # vrátí všechny produkty
    query = {} if not category or category == "All" else {"category": category}

    # Načtení produktů z MongoDB, bez interního Mongo pole _id
    products = await db.products.find(query, {"_id": 0}).to_list(100)

    return products


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    # Najde konkrétní produkt podle vlastního id
    product = await db.products.find_one({"id": product_id}, {"_id": 0})

    # Pokud produkt neexistuje, vrátí 404
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@api_router.post("/products", response_model=Dict[str, Any])
async def create_product(product: ProductCreate):
    # Převede přijatý ProductCreate model na slovník
    product_dict = product.model_dump()

    # Vytvoří plnohodnotný Product objekt
    # tím se doplní id a created_at
    product_obj = Product(**product_dict)

    # Převede Product objekt opět na slovník pro uložení do DB
    doc = product_obj.model_dump()

    # created_at převede na ISO string, aby se dobře ukládal
    doc['created_at'] = doc['created_at'].isoformat()

    # Uložení do kolekce products
    await db.products.insert_one(doc)

    # Pro jistotu odstranění _id, kdyby se někde objevilo
    doc.pop('_id', None)

    return doc


@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate):
    # Nejprve zkontroluje, jestli produkt existuje
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    # Data pro update
    update_data = product.model_dump()

    # Aktualizace produktu
    await db.products.update_one({"id": product_id}, {"$set": update_data})

    # Načtení aktualizovaného produktu
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})

    return updated


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    # Smazání produktu podle id
    result = await db.products.delete_one({"id": product_id})

    # Pokud se nic nesmazalo, produkt neexistoval
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted"}


# =========================================================
# Košík
# =========================================================

@api_router.get("/cart/{session_id}", response_model=CartResponse)
async def get_cart(session_id: str):
    # Najde košík podle session_id
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})

    # Pokud košík neexistuje, vrátí prázdný
    if not cart:
        return CartResponse(session_id=session_id, items=[], total=0)

    items_with_products = []
    total = 0

    # Projde všechny položky v košíku
    for item in cart.get("items", []):
        # Ke každé položce dohledá detail produktu
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})

        if product:
            # Přidá detail produktu přímo do položky
            item["product"] = product

            # Připočítá cenu do celkového součtu
            total += product["price"] * item["quantity"]

        # Přidá položku do výsledného seznamu
        items_with_products.append(item)

    # Vrátí košík i s celkovou cenou
    return CartResponse(session_id=session_id, items=items_with_products, total=total)


@api_router.post("/cart/{session_id}", response_model=CartResponse)
async def update_cart(session_id: str, cart_update: CartUpdate):
    # Převede seznam CartItem objektů na obyčejné dicty
    items = [item.model_dump() for item in cart_update.items]

    # Uloží / přepíše košík do databáze
    # upsert=True znamená: pokud neexistuje, vytvoř
    await db.carts.update_one(
        {"session_id": session_id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    items_with_products = []
    total = 0

    # Znovu doplní produktové detaily ke každé položce
    for item in items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})

        if product:
            item["product"] = product
            total += product["price"] * item["quantity"]

        items_with_products.append(item)

    # Vrátí aktualizovaný košík
    return CartResponse(session_id=session_id, items=items_with_products, total=total)


@api_router.delete("/cart/{session_id}")
async def clear_cart(session_id: str):
    # Smaže celý košík podle session_id
    await db.carts.delete_one({"session_id": session_id})

    return {"message": "Cart cleared"}


# =========================================================
# Chat s AI asistentem
# =========================================================

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(chat_message: ChatMessage):
    try:
        # Načte produkty z databáze, ale jen vybraná pole
        products = await db.products.find(
            {},
            {"_id": 0, "name": 1, "description": 1, "price": 1, "category": 1}
        ).to_list(50)

        # Připraví textový kontext s produkty pro AI
        products_context = "\n".join([
            f"- {p['name']} ({p['category']}): ${p['price']}"
            for p in products
        ])

        # System prompt pro AI model
        # Říká modelu, jak se má chovat a jaké má informace o produktech
        system_message = f"""Jsi pomocný asistent pro e-shop SIERRA 97 SX se streetwear oblečením. Odpovídej v češtině, přátelsky a stručně.

Produkty v obchodě:
{products_context if products else "Momentálně nemáme žádné produkty."}"""

        # Zavolání Groq AI modelu
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": chat_message.message}
            ]
        )

        # Vrátí odpověď AI a session_id
        return ChatResponse(
            response=response.choices[0].message.content,
            session_id=chat_message.session_id
        )

    except Exception as e:
        # Zaloguje chybu do konzole / logů
        logging.error(f"Chat error: {e}")

        # Uživateli vrátí bezpečnou obecnou chybu
        return ChatResponse(
            response="Omlouvám se, momentálně mám technické potíže.",
            session_id=chat_message.session_id
        )


# =========================================================
# Seed databáze - naplnění ukázkovými daty
# =========================================================

@api_router.post("/seed")
async def seed_database():
    # Smaže všechny produkty
    await db.products.delete_many({})

    # Připraví ukázkové produkty
    sample_products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Essential Hoodie",
            "description": "Premium cotton hoodie",
            "price": 89.99,
            "category": "Hoodies",
            "images": ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": ["Black", "White"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Street Logo Tee",
            "description": "Organic cotton t-shirt",
            "price": 45.00,
            "category": "T-Shirts",
            "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": ["Black", "White"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Urban Cargo Pants",
            "description": "Relaxed fit cargo pants",
            "price": 120.00,
            "category": "Pants",
            "images": ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": ["Black", "Olive"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bomber Jacket",
            "description": "Classic bomber jacket",
            "price": 189.99,
            "category": "Jackets",
            "images": ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800"],
            "sizes": ["S", "M", "L", "XL"],
            "colors": ["Black", "Navy"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]

    # Vloží ukázkové produkty do databáze
    await db.products.insert_many(sample_products)

    # Vrátí informaci, kolik produktů bylo vloženo
    return {"message": f"Seeded {len(sample_products)} products"}


# =========================================================
# Registrace routeru a middleware
# =========================================================

# Připojí všechny endpointy z api_router do aplikace
app.include_router(api_router)

# Přidá CORS middleware
# allow_origins=["*"] znamená, že API může volat frontend odkudkoliv
# To je pohodlné pro vývoj, ale v produkci je lepší omezit na konkrétní domény
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Nastaví základní úroveň logování
logging.basicConfig(level=logging.INFO)


# =========================================================
# Ukončení aplikace
# =========================================================

@app.on_event("shutdown")
async def shutdown_db_client():
    # Při vypnutí aplikace korektně zavře spojení s MongoDB
    client.close()