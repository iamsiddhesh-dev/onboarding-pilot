from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.db import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industries = Column(String, nullable=False, default="[]")  # JSON-encoded list[str]
    job_titles = Column(String, nullable=False, default="[]")  # JSON-encoded list[str]
    years_experience = Column(Integer, nullable=True)
    skills = Column(String, nullable=False, default="[]")  # JSON-encoded list[str]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
