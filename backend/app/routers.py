import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Profile
from app.schemas import ProfileCreate, ProfileResponse

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
