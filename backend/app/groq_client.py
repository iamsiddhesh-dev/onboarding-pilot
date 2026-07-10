"""Groq API client with a mock fallback.

Exposes a single function, ``extract_profile(text: str) -> dict``, which
returns a dict matching the ``ExtractProfileResponse`` shape:
    {
        "industries": [str],
        "job_titles": [str],
        "years_experience": int | None,
        "skills": [str],
    }

If ``GROQ_API_KEY`` is unset, or the Groq API call fails for any reason,
this falls back to a canned, realistic mock response so the app works
end-to-end with zero API keys configured. No exception ever propagates
out of ``extract_profile``.
"""

import json
import os

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = (
    "You are a resume and professional bio parser for an onboarding tool. "
    "Given raw pasted text (a resume, LinkedIn bio, or short professional "
    "summary), extract structured profile data. Respond with strict JSON "
    "only, matching exactly this shape:\n"
    "{\n"
    '  "name": string or null,\n'
    '  "industries": [string, ...],\n'
    '  "job_titles": [string, ...],\n'
    '  "years_experience": integer or null,\n'
    '  "skills": [string, ...]\n'
    "}\n"
    "- name: the person's full name, usually near the top of a resume/bio, "
    "or null if it cannot be confidently identified (do not guess from an "
    "email address or filename alone).\n"
    "- industries: the industries/sectors the person has worked in "
    "(e.g. \"Fintech\", \"Healthcare\").\n"
    "- job_titles: distinct job titles/roles held or implied.\n"
    "- years_experience: your best estimate of total professional years "
    "of experience as an integer, or null if it cannot be estimated.\n"
    "- skills: concrete skills, tools, or technologies mentioned or "
    "clearly implied.\n"
    "Do not include any commentary, markdown, or text outside the JSON "
    "object."
)


def _mock_response() -> dict:
    """A realistic, deterministic mock extraction.

    Deliberately contains duplicates (case-insensitive) and more than 10
    skills so callers relying on server-side dedupe/cap logic actually
    exercise it.
    """
    return {
        "name": "Jordan Rivera",
        "industries": [
            "Fintech",
            "Healthcare",
            "fintech",  # duplicate (different casing) - proves dedupe
            "E-commerce",
        ],
        "job_titles": [
            "Senior Product Manager",
            "Product Manager",
            "Product Lead",
        ],
        "years_experience": 8,
        "skills": [
            "Product Strategy",
            "SQL",
            "Roadmapping",
            "A/B Testing",
            "Stakeholder Management",
            "sql",  # duplicate (different casing) - proves dedupe
            "User Research",
            "Agile",
            "Data Analysis",
            "Cross-functional Leadership",
            "Figma",
            "Python",  # 12th raw skill - proves cap-to-10 downstream
        ],
    }


def _call_groq(text: str, api_key: str) -> dict:
    from groq import Groq

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    )
    content = completion.choices[0].message.content
    data = json.loads(content)
    return {
        "name": data.get("name"),
        "industries": list(data.get("industries") or []),
        "job_titles": list(data.get("job_titles") or []),
        "years_experience": data.get("years_experience"),
        "skills": list(data.get("skills") or []),
    }


def extract_profile(text: str) -> dict:
    """Extract a structured profile from raw resume/bio text.

    Uses the Groq API when GROQ_API_KEY is set; falls back to a canned
    mock response if the key is missing or the API call fails for any
    reason. Never raises.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return _mock_response()

    try:
        return _call_groq(text, api_key)
    except Exception:
        return _mock_response()
