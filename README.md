# Vacation Calendar

A React + Express + PostgreSQL vacation accrual simulator.

## Current Slice

- Register, login, logout, and current-user endpoint using HTTP-only cookies.
- User-owned simulation profiles with default settings.
- Sparse day overrides for vacation, personal, public holiday, and unpaid days.
- Responsive 12-month calendar with projected vacation balance per day.
- Docker Compose stack attached to the external `torrentnet` network.

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment values:

   ```bash
   cp .env.example .env
   ```

3. Start the database and API containers, then run migrations:

   ```bash
   docker network inspect torrentnet || docker network create torrentnet
   npm run build --workspace api
   docker compose up -d --build postgres api
   docker compose exec api npm run migrate
   ```

4. Run the frontend dev server:

   ```bash
   npm run dev:frontend
   ```

The frontend dev server runs at `http://localhost:5173` and proxies `/api` to `http://localhost:3333`.
The API container publishes `http://localhost:3333` for local frontend development.

For local HTTP testing, keep these `.env` values:

```bash
CORS_ORIGIN=http://localhost:5173
COOKIE_DOMAIN=
COOKIE_SECURE=false
TRUST_PROXY=false
```

## Docker Deployment

### Home Server Deployment Over SSH

1. SSH into the server:

   ```bash
   ssh <your-user>@<your-server>
   ```

2. Clone the repository and enter it:

   ```bash
   git clone https://github.com/jhoelbadilla/vacation-calendar.git
   cd vacation-calendar
   ```

3. Create the environment file:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` for the home server. Use strong values for `POSTGRES_PASSWORD` and `SESSION_SECRET`.

   For your reverse-proxy/domain deployment, use values like:

   ```bash
   CORS_ORIGIN=https://vaccal.jjhome.one
   COOKIE_DOMAIN=vaccal.jjhome.one
   COOKIE_SECURE=true
   TRUST_PROXY=true
   FRONTEND_PORT=8585
   API_PORT=3333
   ```

5. Confirm or create the external Docker network:

   ```bash
   docker network inspect torrentnet || docker network create torrentnet
   ```

6. Build and start the stack:

   ```bash
   docker compose up -d --build
   docker compose exec api npm run migrate
   ```

7. Point your reverse proxy to the frontend container:

   ```text
   vaccal.jjhome.one -> http://<server-ip>:8585
   ```

   The frontend container proxies `/api/*` to the API service inside Docker. If you prefer to route API traffic directly in your reverse proxy, send `vaccal.jjhome.one/api/*` to `http://<server-ip>:3333`.

8. Check service health:

   ```bash
   docker compose ps
   docker compose logs -f api
   ```

Confirm the external Docker network exists:

```bash
docker network inspect torrentnet
```

Start the stack:

```bash
docker compose up -d --build
docker compose exec api npm run migrate
```

For local browser testing without the Vite dev server, open `http://localhost:8585`.

Route `https://vaccal.jjhome.one/` to host port `8585`. The frontend nginx config forwards `/api/*` to the API container automatically.

## Verification

```bash
npm run lint --workspaces
npm run build --workspaces
npm run test --workspaces
docker compose config
```
