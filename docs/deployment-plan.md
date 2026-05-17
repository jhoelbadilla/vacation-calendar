# Deployment Plan

## Deployment goal

Run the vacation calendar app on a local Docker server with the frontend available at `vaccal.jjhome.one` and all app containers attached to the existing Docker network named `torrentnet`.

## Proposed services

```mermaid
flowchart TB
  InternetOrLAN[LAN / browser request for vaccal.jjhome.one]
  ReverseProxy[Existing reverse proxy]
  Frontend[vaccal-frontend]
  API[vaccal-api]
  DB[(vaccal-postgres volume)]
  TorrentNet[[torrentnet external network]]

  InternetOrLAN --> ReverseProxy
  ReverseProxy --> Frontend
  ReverseProxy --> API
  API --> DB

  Frontend --- TorrentNet
  API --- TorrentNet
  DB --- TorrentNet
  ReverseProxy --- TorrentNet
```

## Compose topology

Recommended `docker-compose.yml` service names for implementation:

- `frontend`.
- `api`.
- `postgres`.

Recommended networks:

```yaml
networks:
  torrentnet:
    external: true
```

Each service should attach to `torrentnet`. If the database should not be reachable outside the app stack, add an internal Compose network as well and attach PostgreSQL only to that internal network plus the API. However, the user explicitly requested use of `torrentnet`, so the implementation should document the tradeoff and can keep all services on `torrentnet` for simplicity.

## Domain routing

The app frontend should be reachable at:

```text
https://vaccal.jjhome.one
```

Recommended reverse proxy routing:

- `vaccal.jjhome.one/` -> frontend container port `80`.
- `vaccal.jjhome.one/api/*` -> API container port `3000`.

If the frontend and API are served under the same domain, cookie authentication is simpler and safer.

## Environment variables

### API

| Variable | Example | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables production behavior. |
| `PORT` | `3000` | API listen port. |
| `DATABASE_URL` | `postgres://vaccal:change-me@postgres:5432/vaccal` | PostgreSQL connection. |
| `SESSION_SECRET` | long random value | Signs sessions or JWT cookies. |
| `COOKIE_DOMAIN` | `vaccal.jjhome.one` | Production cookie domain if needed. |
| `CORS_ORIGIN` | `https://vaccal.jjhome.one` | Allowed frontend origin. |
| `TRUST_PROXY` | `true` | Trust reverse proxy headers for secure cookies. |

### PostgreSQL

| Variable | Example | Purpose |
| --- | --- | --- |
| `POSTGRES_DB` | `vaccal` | Database name. |
| `POSTGRES_USER` | `vaccal` | Database user. |
| `POSTGRES_PASSWORD` | generated secret | Database password. |

### Frontend

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | API base path. |

## Example Compose sketch

This is a planning sketch, not the final implementation file:

```yaml
services:
  frontend:
    build: ./frontend
    restart: unless-stopped
    networks:
      - torrentnet
    depends_on:
      - api

  api:
    build: ./api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://vaccal:${POSTGRES_PASSWORD}@postgres:5432/vaccal
      SESSION_SECRET: ${SESSION_SECRET}
      CORS_ORIGIN: https://vaccal.jjhome.one
      TRUST_PROXY: "true"
    networks:
      - torrentnet
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: vaccal
      POSTGRES_USER: vaccal
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - torrentnet

volumes:
  postgres_data:

networks:
  torrentnet:
    external: true
```

## Deployment steps for final implementation

1. Create a `.env` file from `.env.example`.
2. Generate strong secrets for `POSTGRES_PASSWORD` and `SESSION_SECRET`.
3. Confirm the Docker network exists:

   ```bash
   docker network inspect torrentnet
   ```

4. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

5. Run database migrations:

   ```bash
   docker compose exec api npm run migrate
   ```

6. Configure the reverse proxy for `vaccal.jjhome.one`.
7. Confirm the app loads and authentication cookies are secure.

## Backup and restore

Recommended backup command pattern:

```bash
docker compose exec postgres pg_dump -U vaccal vaccal > vaccal-backup.sql
```

Recommended restore command pattern:

```bash
cat vaccal-backup.sql | docker compose exec -T postgres psql -U vaccal vaccal
```

## Operational notes

- Keep database data in a named volume.
- Do not commit `.env` files.
- Rotate `SESSION_SECRET` only with an understanding that existing sessions will be invalidated.
- Run dependency updates and image rebuilds periodically.
- Monitor API logs for repeated failed login attempts.
