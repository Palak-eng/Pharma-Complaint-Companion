# Pharma Complaint Companion

AI-powered customer complaint management system for pharmaceutical manufacturing, quality assurance, and complaint triage workflows.

## Overview

This project helps teams capture, classify, investigate, and resolve customer complaints more efficiently. It combines:

- a modern React + TypeScript frontend
- a FastAPI backend
- AI-assisted complaint extraction, summarization, and root-cause analysis
- PostgreSQL-backed complaint storage
- workflow tracking for review, investigation, and closure

The goal is to reduce manual effort while making complaint handling more structured, consistent, and auditable.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Redux Toolkit
- TanStack Start
- Tailwind CSS v4
- shadcn/ui
- Zod
- Sonner

### Backend

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- LangGraph
- Groq LLM
- Pydantic

## Solution Highlights

### AI-powered complaint processing

- complaint extraction from natural language input
- risk assessment and classification
- duplicate detection for similar complaints
- root-cause analysis suggestions
- CAPA recommendations
- summary generation for review
- completeness scoring and missing field detection

### Complaint management workflow

- create, read, update, and delete complaints
- status progression: Open → In Review → Resolved → Closed
- sorting and filtering by status, risk, priority, and date
- pagination for large datasets
- CSV export support
- dark mode support

## Project Structure

```text
Pharma-Complaint-Companion/
├── backend/
│   ├── app/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── routes/
│   ├── components/
│   └── app/
├── package.json
├── vite.config.*
├── README.md
├── .env.example
└── .gitignore
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 13+
- npm or pnpm

## Quick Start

### 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pharma_complaints
GROQ_API_KEY=your_groq_api_key_here
LLM_MODEL=gemma2-9b-it
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5174
```

Start the API:

```bash
python main.py
```

The API will run at:

- http://localhost:8000
- API docs: http://localhost:8000/docs

### 2. Frontend setup

From the project root:

```bash
npm install
```

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:8000
```

Run the app:

```bash
npm run dev
```

The frontend runs at:

- http://localhost:5173

## Environment Variables

### Frontend

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

### Backend

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/pharma_complaints` | PostgreSQL connection URL |
| `GROQ_API_KEY` | required | Groq API key for model inference |
| `LLM_MODEL` | `gemma2-9b-it` | Model used for AI workflows |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://localhost:5174` | Allowed origins |

## API Endpoints

The backend exposes complaint and AI endpoints such as:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/complaints/` | GET | List complaints |
| `/api/complaints/` | POST | Create complaint |
| `/api/complaints/{id}` | GET | Fetch complaint by ID |
| `/api/complaints/{id}` | PUT | Update complaint |
| `/api/complaints/{id}` | DELETE | Delete complaint |
| `/api/complaints/count` | GET | Count complaints |
| `/api/complaints/search` | GET | Search complaints |
| `/api/ai/extract` | POST | Extract structured complaint details |
| `/api/ai/ask` | POST | Ask follow-up AI prompts |
| `/api/ai/risk` | POST | Risk assessment |
| `/api/ai/root-cause` | POST | Root cause analysis |
| `/api/ai/duplicates` | POST | Duplicate check |
| `/api/ai/capa` | POST | CAPA recommendations |
| `/api/ai/summary` | POST | Complaint summary |
| `/api/ai/completeness` | POST | Completeness validation |

## Features in Detail

### Complaint Extraction

AI helps extract relevant complaint fields from freeform text, emails, and issue descriptions.

### Risk Assessment

The system can classify risk based on complaint severity, product impact, and operational context.

### Root Cause Analysis

AI suggests likely causes and investigation steps to support quality review.

### Duplicate Detection

The platform checks for similar complaints to reduce duplicate records and improve triage.

### CAPA Recommendations

Generated suggestions can support corrective and preventive action planning.

## Safety and Operational Notes

- AI-generated output should support, not replace, human review.
- Use real product and complaint data only in controlled environments.
- Validate generated recommendations with quality and compliance teams.
- Keep API keys and database credentials out of public repositories.

## Roadmap

Potential future improvements include:

- user roles and access control
- complaint attachments and document OCR
- audit trail and approval workflow
- analytics dashboards for recurring issues
- export to compliance reporting formats

## License

This project is currently intended for academic / portfolio / internal-use development unless otherwise specified.

## Author

Palak Barsaiyan
