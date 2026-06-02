# INVNTRY — Inventory & Order Management System

A full-stack Inventory & Order Management System built with **FastAPI**, **React**, **PostgreSQL**, and **Docker**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Frontend | React 18 + React Query + Recharts |
| Database | PostgreSQL 15 |
| Containerization | Docker + Docker Compose |

---

## Features

### Business Rules Implemented
- ✅ Unique product SKUs enforced at DB + API level
- ✅ Unique customer emails enforced at DB + API level
- ✅ Inventory validation before order creation
- ✅ Automatic stock reduction when orders are placed
- ✅ Stock restoration when orders are deleted
- ✅ Orders CANNOT be created when stock is insufficient

### API Endpoints
- `GET/POST /products/` — List & create products
- `GET/PUT/DELETE /products/{id}` — Manage individual products
- `PATCH /products/{id}/stock` — Adjust stock levels
- `GET/POST /customers/` — List & create customers
- `GET/PUT/DELETE /customers/{id}` — Manage individual customers
- `GET/POST /orders/` — List & create orders
- `GET/DELETE /orders/{id}` — View & delete orders
- `PATCH /orders/{id}/status` — Update order status
- `GET /dashboard/stats` — Aggregated stats
- `GET /health` — Health check

---

## Quick Start (Docker Compose)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd inventory-system

# 2. Set up environment variables
cp .env.example .env
# Edit .env if needed

# 3. Build and run
docker compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# API Docs → http://localhost:8000/docs
```

---

## Local Development (Without Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL="postgresql://user:pass@localhost:5432/inventory_db"
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000 npm start
```

---

## Deployment Guide

### Backend → Render.com (Free)

1. Push backend folder to GitHub
2. Create new **Web Service** on Render
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `DATABASE_URL` → your Render PostgreSQL URL
6. Add **PostgreSQL** database on Render (free tier)

### Frontend → Vercel / Netlify (Free)

**Vercel:**
```bash
npm install -g vercel
cd frontend
REACT_APP_API_URL=https://your-backend.onrender.com npm run build
vercel --prod
```

**Netlify:**
1. Set build command: `npm run build`
2. Set publish directory: `build`
3. Add env var: `REACT_APP_API_URL=https://your-backend.onrender.com`

### Docker Hub

```bash
# Build and push backend image
docker build -t yourdockerhub/inventory-backend:latest ./backend
docker push yourdockerhub/inventory-backend:latest

# Build and push frontend image
docker build \
  --build-arg REACT_APP_API_URL=https://your-backend-url \
  -t yourdockerhub/inventory-frontend:latest ./frontend
docker push yourdockerhub/inventory-frontend:latest
```

---

## API Documentation

After starting the backend, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Project Structure

```
inventory-system/
├── backend/
│   ├── main.py          # FastAPI app + all routes
│   ├── models.py        # SQLAlchemy ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── crud.py          # Database operations
│   ├── database.py      # DB connection setup
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── styles.css
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Customers.jsx
│   │   │   └── Orders.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   └── utils/
│   │       └── api.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `inventory_db` |
| `POSTGRES_USER` | Database user | `inventory_user` |
| `POSTGRES_PASSWORD` | Database password | `inventory_pass` |
| `DATABASE_URL` | Full DB connection string | auto-built |
| `REACT_APP_API_URL` | Backend API URL for frontend | `http://localhost:8000` |
