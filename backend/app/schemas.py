from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ExtractProfileRequest(BaseModel):
    text: str


class ExtractProfileResponse(BaseModel):
    name: Optional[str] = None
    industries: list[str] = Field(default_factory=list)
    job_titles: list[str] = Field(default_factory=list)
    years_experience: Optional[int] = None
    skills: list[str] = Field(default_factory=list)


class ProfileCreate(ExtractProfileResponse):
    name: str


class ProfileResponse(ExtractProfileResponse):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
