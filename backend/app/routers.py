import json
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.db import get_db
from app.groq_client import extract_profile
from app.models import Profile
from app.schemas import ExtractProfileRequest, ExtractProfileResponse, ProfileCreate, ProfileResponse

router = APIRouter(prefix="/api")


def _row_to_response(row: Profile) -> ProfileResponse:
    return ProfileResponse(
        id=row.id,
        name=row.name,
        industries=json.loads(row.industries),
        job_titles=json.loads(row.job_titles),
        years_experience=row.years_experience,
        skills=json.loads(row.skills),
        created_at=row.created_at,
    )


def _dedupe_case_insensitive(values: list[str]) -> list[str]:
    """Dedupe a list of strings case-insensitively, preserving the first-seen casing."""
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = value.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


@router.post("/extract-profile", response_model=ExtractProfileResponse)
def extract_profile_endpoint(payload: ExtractProfileRequest):
    raw = extract_profile(payload.text)

    industries = _dedupe_case_insensitive(list(raw.get("industries") or []))
    job_titles = _dedupe_case_insensitive(list(raw.get("job_titles") or []))
    skills = _dedupe_case_insensitive(list(raw.get("skills") or []))[:10]

    return ExtractProfileResponse(
        industries=industries,
        job_titles=job_titles,
        years_experience=raw.get("years_experience"),
        skills=skills,
    )


@router.post("/parse-resume-file")
async def parse_resume_file(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    content = await file.read()

    if filename.endswith(".pdf"):
        try:
            reader = PdfReader(BytesIO(content))
            text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        except Exception:
            raise HTTPException(status_code=400, detail="Could not read this PDF. Try a different file.")
        if not text:
            raise HTTPException(status_code=400, detail="No extractable text found in this PDF (it may be a scanned image).")
    else:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Could not read this file as text.")

    return {"text": text}


@router.post("/profiles", response_model=ProfileResponse)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    row = Profile(
        name=payload.name,
        industries=json.dumps(payload.industries),
        job_titles=json.dumps(payload.job_titles),
        years_experience=payload.years_experience,
        skills=json.dumps(payload.skills[:10]),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_response(row)


@router.get("/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    row = db.query(Profile).filter(Profile.id == profile_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _row_to_response(row)
