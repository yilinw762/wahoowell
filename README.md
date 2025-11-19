# wahoowell

## Local development with Docker

Run both the FastAPI backend and the Next.js frontend together:

```bash
docker compose up --build
```

Services:

- **backend** → http://localhost:8000 (FastAPI + GCS uploads)
- **frontend** → http://localhost:3000 (Next.js app)
- **db** → MySQL 8 (port 3307 on host)

The backend now reads credentials directly from environment variables; docker-compose already injects the defaults (DB host/user/password/name) so the API talks to the bundled database without relying on `backend/.env`. Tweak those values inside `docker-compose.yml` (or supply them via your own environment) if you need different secrets.

## Production builds

Two Dockerfiles ship in the repo:

- `/Dockerfile` – builds the FastAPI backend (uvicorn on port 8080)
- `/frontend/Dockerfile` – builds the Next.js site in standalone mode (Node 20 runtime on port 8080)

You can push them separately (e.g., to Cloud Run) or adapt the new `docker-compose.yml` as a reference for multi-service deployments.