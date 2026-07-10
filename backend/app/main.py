from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.routers import router

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
