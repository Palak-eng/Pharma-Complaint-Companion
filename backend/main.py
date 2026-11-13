import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import complaints, ai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CORS_ORIGINS = [
    origin.strip()
    for origin in __import__("os").getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174").split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning(f"Could not connect to database: {e}")
        logger.warning("Server will start without database. API endpoints requiring DB will fail.")
    yield

app = FastAPI(
    title="Pharma Complaint Companion API",
    description="AI-powered customer complaint management for pharmaceutical QMS",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"message": "Pharma Complaint Companion API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
