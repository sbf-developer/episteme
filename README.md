# Episteme

Personal ontology & epistemology app — map goals, connect ideas, track actions, and get AI-assisted planning.

**Stack:** Vite + React (SPA) · Hono API · PostgreSQL · Prisma · Google OAuth · DeepSeek AI

## Features

- Notes with auto-save, Save, Save As
- Goals and linked actions
- Knowledge graph visualization
- AI assistant with full user context (DeepSeek)
- Global search
- Google sign-in
- Minimal Apple/Cursor-inspired UI

## Local development

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/personal_epistemology"
SESSION_SECRET="your-secret-at-least-16-chars"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
DEEPSEEK_API_KEY="..."
APP_URL="http://localhost:3000"
CLIENT_URL="http://localhost:5173"
```

Google OAuth redirect URI:
```
http://localhost:3000/api/auth/google/callback
```

### 3. Database

```bash
npm run db:migrate    # or: npm run db:push
```

### 4. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173 (proxied to API)
- API: http://localhost:3000

## VPS production deploy

### Environment variables

Set these on your VPS (same values for both URLs in production):

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/personal_epistemology
SESSION_SECRET=<long-random-string>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DEEPSEEK_API_KEY=...
APP_URL=https://your-domain.com
CLIENT_URL=https://your-domain.com
COOKIE_SECURE=true
```

`COOKIE_SECURE=true` is required when running behind nginx/HTTPS reverse proxy.

Google OAuth production redirect URI:
```
https://your-domain.com/api/auth/google/callback
```

### Option A: Nixpacks (Railway, Coolify, etc.)

The included `nixpacks.toml` will:
1. Install dependencies
2. Generate Prisma client + build client & server
3. Run migrations on start
4. Serve everything on one port

### Option B: Manual VPS deploy

```bash
npm install
npm run build
npm run db:migrate:deploy
NODE_ENV=production npm start
```

Or use `deploy/start.sh`.

### Nginx reverse proxy

See `deploy/nginx.conf` — proxy all traffic to port 3000. The Node server serves both the API and the React SPA.

### Health check

```
GET /api/health
```

Returns `{ ok: true, db: "connected" }` when healthy.

## Project structure

```
client/          Vite + React SPA
server/          Hono API + Prisma
  prisma/        Schema + migrations
deploy/          nginx config + start script
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (API + Vite) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run db:migrate` | Dev migrations |
| `npm run db:migrate:deploy` | Production migrations |
| `npm run db:push` | Push schema (no migration files) |
