# Pharma Complaint Companion

AI-powered Customer Complaint Management System for pharmaceutical (API & FDF) manufacturing QMS.

## Tech Stack

### Frontend

- React 19 + TypeScript
- Redux Toolkit (state management)
- TanStack Start (SSR framework)
- Tailwind CSS v4
- shadcn/ui components
- Zod (form validation)
- Sonner (toast notifications)

### Backend

- Python FastAPI
- LangGraph (AI agent workflows)
- Groq LLM (gemma2-9b-it)
- SQLAlchemy + PostgreSQL

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pharma_complaints
GROQ_API_KEY=your_groq_api_key_here
LLM_MODEL=gemma2-9b-it
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5174
```

Start the server:

```bash
python main.py
```

The API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### Frontend

```bash
npm install
npm run dev
```

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:8000
```

The app runs at `http://localhost:5173` and proxies API calls to the backend.

## Features

### AI-Powered Complaint Processing

- **Complaint Extraction** — Extract structured data from documents/emails
- **Risk Assessment** — AI-powered QMS risk classification
- **Root Cause Analysis** — Probable causes and investigation steps
- **Duplicate Detection** — Find similar existing complaints
- **CAPA Recommendations** — Corrective and Preventive Action suggestions
- **Complaint Summary** — Executive brief and detailed summary
- **Completeness Check** — Score and missing field identification

### Complaint Management

- **Full CRUD** — Create, read, update, delete complaints
- **Status Workflow** — Open → In Review → Resolved → Closed
- **Sort & Filter** — By status, risk level, date, priority
- **Pagination** — Load more for large datasets
- **CSV Export** — Export filtered complaints to CSV
- **Dark Mode** — Toggle between light and dark themes

### Form Validation

- Required field enforcement
- Date format validation (YYYY-MM-DD)
- Enum validation for severity, priority, and complaint type
- Toast notifications for validation errors

## Environment Variables

### Frontend (`.env`)

| Variable       | Default                 | Description     |
| -------------- | ----------------------- | --------------- |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

### Backend (`backend/.env`)

| Variable       | Default                                                             | Description                            |
| -------------- | ------------------------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/pharma_complaints`   | PostgreSQL connection string           |
| `GROQ_API_KEY` | —                                                                   | Groq API key for LLM                   |
| `LLM_MODEL`    | `gemma2-9b-it`                                                      | LLM model name                         |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://localhost:5174` | Allowed CORS origins (comma-separated) |

## API Endpoints

| Endpoint                 | Method | Description                                                                   |
| ------------------------ | ------ | ----------------------------------------------------------------------------- |
| `/api/complaints/`       | GET    | List complaints (query: skip, limit, status, risk_class, sort_by, sort_order) |
| `/api/complaints/`       | POST   | Create complaint                                                              |
| `/api/complaints/{id}`   | GET    | Get complaint by ID                                                           |
| `/api/complaints/{id}`   | PUT    | Update complaint                                                              |
| `/api/complaints/{id}`   | DELETE | Delete complaint                                                              |
| `/api/complaints/count`  | GET    | Get complaint count (query: status, risk_class)                               |
| `/api/complaints/search` | GET    | Search complaints (query: q)                                                  |
| `/api/ai/extract`        | POST   | Extract complaint from text                                                   |
| `/api/ai/ask`            | POST   | Ask follow-up question                                                        |
| `/api/ai/risk`           | POST   | Risk assessment                                                               |
| `/api/ai/root-cause`     | POST   | Root cause analysis                                                           |
| `/api/ai/duplicates`     | POST   | Duplicate check                                                               |
| `/api/ai/capa`           | POST   | CAPA generation                                                               |
| `/api/ai/summary`        | POST   | Complaint summary                                                             |
| `/api/ai/completeness`   | POST   | Completeness check                                                            |
