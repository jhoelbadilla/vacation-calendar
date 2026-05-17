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

3. Start PostgreSQL, then run migrations:

   ```bash
   npm run migrate
   ```

4. Run the API and frontend in separate terminals:

   ```bash
   npm run dev:api
   npm run dev:frontend
   ```

The frontend dev server runs at `http://localhost:5173` and proxies `/api` to `http://localhost:3000`.

## Docker Deployment

Confirm the external Docker network exists:

```bash
docker network inspect torrentnet
```

Start the stack:

```bash
docker compose up -d --build
docker compose exec api npm run migrate
```

Route `https://vaccal.jjhome.one/` to the `frontend` service on port `80` and `/api/*` to the `api` service on port `3000`.

## Verification

```bash
npm run lint --workspaces
npm run build --workspaces
npm run test --workspaces
docker compose config
```
