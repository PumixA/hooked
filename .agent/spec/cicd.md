# CI/CD Pipeline

> Version: 3.0.0

---

## Architecture

```
Push to main → GitHub Actions (cloud) → Lint + Build → GitHub Actions (self-hosted) → git pull + docker compose up --build
Push tag v* → GitHub Actions → Generate release notes → Create GitHub Release
```

## Branch Protection

| Branch | Rules                                                          |
| ------ | -------------------------------------------------------------- |
| `main` | PR required, 1 approval, CI passing, no force push             |
| `dev`  | PR required, CI passing                                        |

## GitHub Actions Workflows

### 1. Deploy (`deploy.yml`)

**Trigger**: push on `main`

**Jobs**:
1. **lint-and-build**: Validates code compiles
   - Node 20, npm ci
   - `npm run lint` (frontend)
   - `npm run build` (frontend + backend)
2. **deploy**: Runs on self-hosted runner (production server)
   - `runs-on: self-hosted`
   - `cd /opt/hooked && git pull origin main && docker compose up -d --build`

**Self-hosted Runner**:
- Installed at `/home/pumix/actions-runner/` on production server (192.168.1.153)
- Runs as systemd service: `actions.runner.PumixA-hooked.hooked-server.service`
- User: `pumix` (member of `docker` group)
- Labels: `self-hosted`, `linux`, `x64`
- No inbound ports required (runner polls GitHub for jobs)

### 2. Release (`release.yml`)

**Trigger**: push tag `v*`

- Generates changelog from commits since last tag
- Creates GitHub Release with auto release notes

## Docker Infrastructure

### Development (`docker-compose.yaml`)

```mermaid
graph LR
    A[hooked-db-built] -->|PostgreSQL 15| B[Port 5432]
    C[Adminer] -->|Web UI| D[Port 8080]
    C --> A
```

Services:
- **hooked-db-built**: PostgreSQL database with volume persistence
- **adminer**: Database admin UI (port 8080)

### Production (`docker-compose.prod.yml`)

```mermaid
graph LR
    NPM[Nginx Proxy Manager] --> FE[Frontend nginx]
    FE -->|/api/| BE[Backend Fastify]
    BE --> DB[PostgreSQL]
```

Services:
- **frontend**: Nginx serving SPA build + reverse proxy `/api/` to backend
- **backend**: Fastify compiled (CMD: prisma migrate deploy + node dist/index.js)
- **db**: PostgreSQL 15-alpine with volume persistence
- **npm**: Nginx Proxy Manager for HTTPS/SSL termination

### Frontend Nginx Config

The frontend container uses a custom `nginx.conf` that:
- Serves the SPA with `try_files $uri $uri/ /index.html` for client-side routing
- Proxies `/api/` requests to `http://backend:3000/`
- Proxies `/uploads/` requests to `http://backend:3000/uploads/`

### API URL Strategy

- **Production**: Frontend uses `/api` as base URL (proxied by nginx to backend)
- **Development**: Vite dev server proxies `/api` to `http://localhost:3000`
- Configurable via `VITE_API_URL` environment variable

## Pipeline Stages

```mermaid
graph LR
    A[Push to main] --> B[Lint - cloud]
    B --> C[Build Frontend - cloud]
    C --> D[Build Backend - cloud]
    D --> E[git pull - self-hosted]
    E --> F[Docker Build - self-hosted]
```

### 1. Lint
- ESLint 9 + TypeScript ESLint

### 2. Build Frontend
- `vite build` — generates `dist/` with PWA assets
- `VITE_API_URL=/api` injected at build time

### 3. Build Backend
- TypeScript compilation to `dist/`
- Prisma client generation

### 4. Self-Hosted Deploy
- Self-hosted runner on production server pulls the job
- `git pull origin main` to fetch latest code
- `docker compose up -d --build` to rebuild and restart containers

## Dev Commands

### Frontend (`hooked-pwa/frontend/`)
```bash
npm run dev       # Dev server with hot reload + API proxy
npm run build     # tsc -b && vite build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

### Backend (`hooked-pwa/backend/`)
```bash
npm run dev           # nodemon + ts-node
npm run build         # tsc
npm run create-admin  # Create admin user
npx prisma migrate dev    # Run migrations
npx prisma db seed        # Seed categories
npx prisma generate       # Regenerate client
```

### Docker
```bash
docker compose up -d                    # Start dev DB + Adminer
docker compose -f docker-compose.prod.yml up -d  # Start production
```

## Versioning

- Semantic Versioning: `MAJOR.MINOR.PATCH`
- Tags on `main` branch only
- Current: v1.0.0 (first production release)
- GitHub Releases auto-generated from tags

## Repository

- **Remote**: `git@github.com:PumixA/hooked.git`
- **Deploy key**: SSH ed25519 key on server (`/home/pumix/.ssh/id_ed25519`)
- **Branches**: `main` (production), `dev` (development), `feat/*`, `fix/*`

## Server Setup (One-time)

1. Add user to docker group: `sudo usermod -aG docker pumix`
2. Clone repo in `/opt/hooked/` via SSH deploy key
3. Copy `.env` with production secrets
4. `docker compose -f docker-compose.prod.yml up -d --build`
5. Install GitHub Actions self-hosted runner:
   - Download runner to `/home/pumix/actions-runner/`
   - `./config.sh --url https://github.com/PumixA/hooked --token <TOKEN>`
   - `sudo ./svc.sh install pumix && sudo ./svc.sh start`
6. Verify runner appears as "Online" in GitHub > Settings > Actions > Runners
