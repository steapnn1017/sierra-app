from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from groq import Groq

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY', ''))

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image: Optional[str] = None
    images: List[str] = []
    sizes: List[str] = ["S", "M", "L", "XL"]
    colors: List[str] = ["Black", "White"]
    translations: Optional[Dict[str, Dict[str, str]]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
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
    product_id: str
    quantity: int
    size: str
    color: str

class CartUpdate(BaseModel):
    items: List[CartItem]

class CartResponse(BaseModel):
    session_id: str
    items: List[Dict[str, Any]]
    total: float

class ChatMessage(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    session_id: str

@api_router.get("/")
async def root():
    return {"message": "SIERRA 97 SX API"}

@api_router.get("/products", response_model=List[Dict[str, Any]])
async def get_products(category: Optional[str] = None):
    query = {} if not category or category == "All" else {"category": category}
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Dict[str, Any])
async def create_product(product: ProductCreate):
    product_dict = product.model_dump()
    product_obj = Product(**product_dict)
    doc = product_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = product.model_dump()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.get("/cart/{session_id}", response_model=CartResponse)
async def get_cart(session_id: str):
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    if not cart:
        return CartResponse(session_id=session_id, items=[], total=0)
    items_with_products = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item["product"] = product
            total += product["price"] * item["quantity"]
        items_with_products.append(item)
    return CartResponse(session_id=session_id, items=items_with_products, total=total)

@api_router.post("/cart/{session_id}", response_model=CartResponse)
async def update_cart(session_id: str, cart_update: CartUpdate):
    items = [item.model_dump() for item in cart_update.items]
    await db.carts.update_one(
        {"session_id": session_id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    items_with_products = []
    total = 0
    for item in items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item["product"] = product
            total += product["price"] * item["quantity"]
        items_with_products.append(item)
    return CartResponse(session_id=session_id, items=items_with_products, total=total)

@api_router.delete("/cart/{session_id}")
async def clear_cart(session_id: str):
    await db.carts.delete_one({"session_id": session_id})
    return {"message": "Cart cleared"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(chat_message: ChatMessage):
    try:
        products = await db.products.find({}, {"_id": 0, "name": 1, "description": 1, "price": 1, "category": 1}).to_list(50)
        products_context = "\n".join([f"- {p['name']} ({p['category']}): ${p['price']}" for p in products])
        system_message = f"""Jsi pomocný asistent pro e-shop SIERRA 97 SX se streetwear oblečením. Odpovídej v češtině, přátelsky a stručně.

Produkty v obchodě:
{products_context if products else "Momentálně nemáme žádné produkty."}"""

        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": chat_message.message}
            ]
        )
        return ChatResponse(response=response.choices[0].message.content, session_id=chat_message.session_id)
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return ChatResponse(response="Omlouvám se, momentálně mám technické potíže.", session_id=chat_message.session_id)

@api_router.post("/seed")
async def seed_database():
    await db.products.delete_many({})
    sample_products = [
        {"id": str(uuid.uuid4()), "name": "Essential Hoodie", "description": "Premium cotton hoodie", "price": 89.99, "category": "Hoodies", "images": ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"], "sizes": ["S", "M", "L", "XL"], "colors": ["Black", "White"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Street Logo Tee", "description": "Organic cotton t-shirt", "price": 45.00, "category": "T-Shirts", "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"], "sizes": ["S", "M", "L", "XL"], "colors": ["Black", "White"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Urban Cargo Pants", "description": "Relaxed fit cargo pants", "price": 120.00, "category": "Pants", "images": ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800"], "sizes": ["S", "M", "L", "XL"], "colors": ["Black", "Olive"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Bomber Jacket", "description": "Classic bomber jacket", "price": 189.99, "category": "Jackets", "images": ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800"], "sizes": ["S", "M", "L", "XL"], "colors": ["Black", "Navy"], "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.products.insert_many(sample_products)
    return {"message": f"Seeded {len(sample_products)} products"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()