from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

app = FastAPI(title="GoodSpace Onboarding Copilot")

# Mount frontend static files at root
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

@app.get("/health")
def health():
    return {"status": "ok"}
