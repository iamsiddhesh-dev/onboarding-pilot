from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# Load .env before any app module reads an env var (e.g. db.py's DATABASE_URL,
# groq_client.py's GROQ_API_KEY). Docker Compose injects env vars directly and
# doesn't need this, but plain `uvicorn app.main:app` local runs do.
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from app.db import init_db  # noqa: E402
from app.routers import router  # noqa: E402

app = FastAPI(title="Onboarding Copilot")

init_db()

# API routes must be included before the static mount below, since the
# static mount is a catch-all on "/" and would otherwise shadow /api/*.
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Mount frontend static files at root (must be last: catch-all route)
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
