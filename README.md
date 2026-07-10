# Onboarding Copilot

A fixed, AI-augmented rebuild of a profile-completion onboarding step — built to demonstrate the full loop a Forward Deployed Engineer lives in: **find a real problem in a customer's product → fix it → extend it with an AI integration → ship it running.**

While completing my own profile on a real onboarding wizard, I found **3 genuine bugs** in the industries / job-titles / skills step. Rather than sending a plain bug list, I rebuilt the flow: the bugs are reproduced *and* fixed side by side (toggle between "Before" and "After"), and the form is extended with an **"Autofill with AI"** feature that reads a résumé and fills the fields automatically.

The whole thing runs with one command and needs zero API keys to demo.

---

## Quickstart

```bash
git clone https://github.com/iamsiddhesh-dev/onboarding-pilot.git
cd onboarding-pilot
docker compose up --build
```

Then open **http://localhost:8010**

- The API docs (Swagger UI) are at **http://localhost:8010/docs**
- No API key is required — the AI autofill falls back to a realistic mock so a reviewer can run everything instantly.

### Optional: real AI extraction

To use the live Groq LLM instead of the mock, add a key (free at [console.groq.com](https://console.groq.com)):

```bash
cp .env.example .env
# edit .env and set GROQ_API_KEY=gsk_...
docker compose up --build
```

`.env` is gitignored — your key never leaves your machine.

> **Port note:** the app maps host port **8010** → container port 8000, chosen to avoid the common 8000/3000/5000 collisions with other local projects. Change the `ports:` line in `docker-compose.yml` if 8010 is taken.

### Local dev (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# open http://localhost:8000
```

---

## The 3 bugs (found in the real product, fixed here)

| # | Field | Bug | Root cause | Fix |
|---|-------|-----|-----------|-----|
| 1 | **Industries** | Selecting the same option repeatedly adds duplicate tags; removing one duplicate's ✕ removes *all* copies at once | State keyed by the tag's *value*, not a unique instance id | Each tag gets a unique `instanceId`; removal filters by that. Already-selected options are disabled in the dropdown so duplicates can't be created in the first place |
| 2 | **Job titles** | Identical duplicate / synchronized-delete bug | Same value-keyed state | Same instance-id fix |
| 3 | **Skills** | UI says "up to 10 skills" but accepts an 11th and lets you continue | Cap never enforced | Hard cap at 10 — the add button disables at the limit with an inline warning, and enforced server-side too (defense in depth) |

Toggle **🐛 Before / ✅ After** at the top of the app to see each bug reproduced, then fixed, live. This *is* the bug report — demonstrated, not described.

---

## Architecture

```
┌──────────────┐     HTTP/JSON      ┌────────────────────┐     ┌──────────────┐
│   Frontend   │ ◄───────────────►  │  FastAPI backend   │ ──► │  Groq LLM    │
│ vanilla HTML │   /api/*           │  (single container)│     │ (llama-3.3)  │
│  CSS / JS    │                    │                    │     └──────────────┘
│              │ ◄── static "/" ─── │  serves frontend   │     ┌──────────────┐
└──────────────┘                    │  + REST API        │ ──► │   SQLite     │
                                    └────────────────────┘     │ (SQLAlchemy) │
                                                               └──────────────┘
```

**One container serves everything.** FastAPI hosts the REST API *and* the static frontend from the same origin — no CORS config, no separate frontend server, no npm build step. A reviewer runs `docker compose up` and gets a working full-stack app at one URL.

- **Backend** — FastAPI (Python), SQLAlchemy ORM, SQLite. The Groq client isolates the LLM call behind a single function with a mock fallback, so the app is fully functional with zero external dependencies.
- **Frontend** — dependency-free vanilla HTML/CSS/JS. No framework, no bundler — it loads instantly and is trivial to review.
- **DB** — SQLite for out-of-the-box runnability. Because access goes through SQLAlchemy and the URL is read from `DATABASE_URL`, swapping to PostgreSQL/MySQL is a one-line change.

---

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/extract-profile` | Send `{ "text": "<résumé/bio>" }` → returns structured `{ name, industries[], job_titles[], years_experience, skills[] }`, deduped and skill-capped at 10 |
| `POST` | `/api/parse-resume-file` | Upload a `.pdf`/`.txt`/`.md` file → returns extracted plain text (PDFs parsed server-side via `pypdf`) |
| `POST` | `/api/profiles` | Persist a completed profile → returns the saved record with its `id` |
| `GET`  | `/api/profiles/{id}` | Fetch a saved profile (404 if missing) |
| `GET`  | `/health` | Health check |

A ready-to-run **Postman collection** (`postman_collection.json`) covers every endpoint with assertions. It passes green via `newman run postman_collection.json`.

---

## AI autofill

Paste a résumé/bio (or upload a résumé file), click **Autofill with AI**, and the backend calls Groq's `llama-3.3-70b-versatile` in JSON mode to extract structured data. The extraction fills **Name, Industries, and Skills** — deliberately *not* Job Titles or Years of Experience, since "what role are you targeting" is a decision the candidate should make themselves, not have an AI guess.

**Defense in depth:** the extract endpoint dedupes every list and caps skills at 10 *server-side*, regardless of what the LLM returns — the UI cap is convenience, the server cap is the guarantee.

**Zero-key demo:** if `GROQ_API_KEY` is unset or the API call fails for any reason, the client returns a realistic canned response instead of erroring. The app never breaks for lack of a key.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | FastAPI, Uvicorn, SQLAlchemy, Pydantic |
| AI | Groq API — `llama-3.3-70b-versatile`, JSON mode |
| Database | SQLite (swappable to PostgreSQL/MySQL via `DATABASE_URL`) |
| File parsing | `pypdf`, `python-multipart` |
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| Container | Docker + Docker Compose |
| API tooling | Postman collection (Newman-verified) |
| Config | `.env` via `python-dotenv` |

---

## How this maps to the Forward Deployed Engineer role

The FDE role is about **deploying, configuring, and customizing software for a customer, then translating their feedback into product improvements.** This project is that loop, end to end:

| FDE responsibility | Where it shows up here |
|--------------------|------------------------|
| Understand a customer's product deeply | Found 3 real bugs by actually using the onboarding flow |
| Troubleshoot and fix issues | Diagnosed the root cause of each (value-keyed state, missing cap) and fixed them |
| Build integrations using APIs | Integrated the Groq LLM API for résumé extraction |
| Deploy / configure / customize | Dockerized, one-command run, env-based config, DB swappable |
| Translate feedback into improvements | Turned "this field is broken" into a shipped, demonstrable fix |
| Work across the stack | Python/FastAPI backend, JS frontend, SQL persistence, Docker, AI API — the full JD tool list |

---

## Project structure

```
onboarding-pilot/
  backend/
    app/
      main.py          # FastAPI app, static mount, .env loading
      routers.py       # all API endpoints + dedupe/cap logic
      groq_client.py   # Groq call + mock fallback
      models.py        # SQLAlchemy Profile model
      schemas.py       # Pydantic request/response schemas
      db.py            # engine/session, DATABASE_URL config
    Dockerfile
    requirements.txt
  frontend/
    index.html         # before/after wizard + AI autofill
    style.css
    script.js
  docker-compose.yml
  postman_collection.json
  .env.example
  README.md
```

---

## Author

Built by Siddhesh Kasat as a portfolio piece for Forward Deployed Engineer applications.
