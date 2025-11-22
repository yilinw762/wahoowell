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

## Cloud Run environment variables

The Next.js container now proxies API calls through `/api/backend`, so the runtime only needs to know where the FastAPI service lives. When deploying to Cloud Run, set the following env vars on the **frontend** service:

| Variable | Purpose |
| --- | --- |
| `BACKEND_BASE_URL` | Full HTTPS URL of the FastAPI Cloud Run service (for example `https://wahoowell-backend-xxxxxxxx.a.run.app`). |
| `NEXTAUTH_URL` | Public URL of the frontend service (e.g., `https://wahoowell-frontend-xxxxxxxx.a.run.app`). |
| `NEXTAUTH_SECRET` | Secret string shared with NextAuth (generate once and reuse). |

Optional overrides:

- `NEXT_PUBLIC_API_BASE` → only needed if you want the browser to talk directly to the backend instead of the proxy. By default, requests go through `/api/backend` so you can keep one image for every environment.
- `API_BASE_URL` → legacy server-side override; `BACKEND_BASE_URL` supersedes it.

Example Cloud Run deployment for the frontend (replace `<PROJECT>`, `<REGION>`, and URLs):

```bash
gcloud run deploy wahoowell-frontend \
	--image=us-central1-docker.pkg.dev/<PROJECT>/wahoowell/frontend:latest \
	--region=<REGION> \
	--set-env-vars="BACKEND_BASE_URL=https://wahoowell-backend-xxxxxxxx.a.run.app,NEXTAUTH_URL=https://wahoowell-frontend-xxxxxxxx.a.run.app,NEXTAUTH_SECRET=<your-secret>"
```

Ensure the backend service still receives the usual `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and any Cloud Storage secrets just like in local compose. Once those are in place, the cloud-hosted frontend will load dashboard, leaderboard, followers, and profile data directly from the deployed API.