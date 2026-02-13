# Decision Log

> Lightweight Architecture Decision Records (ADR).
> Every significant technical or architectural choice MUST be logged here.

---

## Template

```markdown
## [YYYY-MM-DD] Decision title
- **Agent**: <agent-id>
- **Context**: Why was this decision needed?
- **Options considered**: Option A vs Option B vs ...
- **Decision**: What was chosen and why
- **Consequences**: What changes as a result (deps, architecture, docs to update)
```

---

<!-- Entries below this line. Most recent on top. -->

## [2026-02-13] Preprod environment with separate Docker stack

- **Agent**: claude-code
- **Context**: Need a staging/preprod environment to test changes before production. The `dev` branch should auto-deploy to a separate URL.
- **Options considered**: (A) Same Docker stack with different ports, (B) Separate docker-compose with isolated services, (C) Separate server
- **Decision**: Option B — `docker-compose.preprod.yml` with isolated services (`db-preprod`, `backend-preprod`, `frontend-preprod`) sharing the same Docker network as prod (for NPM access). Separate DB volume, separate uploads directory.
- **Consequences**:
  - New files: `docker-compose.preprod.yml`, `.github/workflows/deploy-preprod.yml`
  - `frontend/nginx.conf` replaced by `frontend/nginx.conf.template` with `envsubst` for configurable `BACKEND_HOST`
  - Preprod uses env vars prefixed `PREPROD_` in `.env`
  - URL: `https://hooked-preprod.melvin-delorme.fr:33443`

## [2026-02-13] Let's Encrypt DNS challenge via OVH API

- **Agent**: claude-code
- **Context**: Free ISP blocks ports 80 and 443 on residential lines (must use ports > 32768). Let's Encrypt HTTP-01 challenge requires port 80, so cannot be used.
- **Options considered**: (A) Open port 80 — impossible (Free blocks it), (B) DNS-01 challenge via OVH API, (C) Self-signed certificates
- **Decision**: Option B — DNS challenge using OVH API credentials in Nginx Proxy Manager. Certs auto-renew without port 80.
- **Consequences**: OVH API keys stored in NPM config. All SSL certs for new subdomains must use DNS challenge.

## [2026-02-13] Self-hosted GitHub Actions runner for deploy

- **Agent**: claude-code
- **Context**: SSH deploy via `appleboy/ssh-action` failed because the production server (192.168.1.153) is on a private network, unreachable from GitHub's cloud runners.
- **Options considered**: (A) Port forwarding SSH on the router + public IP, (B) Self-hosted GitHub Actions runner on the server
- **Decision**: Option B — Self-hosted runner. More secure (no SSH port exposed to Internet), simpler (runner pulls jobs from GitHub, no inbound connection needed). Installed as systemd service (`actions.runner.PumixA-hooked.hooked-server.service`) running as user `pumix`.
- **Consequences**:
  - Modified: `.github/workflows/deploy.yml` — deploy job uses `runs-on: self-hosted` instead of `ubuntu-latest` + `appleboy/ssh-action`
  - GitHub Secrets `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD` no longer needed for deploy (kept for reference)
  - Runner auto-starts on server boot via systemd
  - Deploy job now runs `git pull && docker compose up -d --build` directly on the server

## [2026-02-13] Fix Prisma client in multi-stage Docker build

- **Agent**: claude-code
- **Context**: Backend container crashed with "@prisma/client did not initialize" after deploying. Prisma `generate` runs in the builder stage but the generated client (`node_modules/.prisma/`) wasn't copied to the production stage.
- **Options considered**: (A) Run `prisma generate` in production stage, (B) Copy `.prisma` from builder
- **Decision**: Option B — Add `COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma` to production stage. Keeps production image clean (no dev deps) while including the generated Prisma client.
- **Consequences**: Modified `backend/Dockerfile`. No runtime generation needed.

## [2026-02-12] CI/CD with GitHub Actions + SSH deploy

- **Agent**: claude-code
- **Context**: Manual deployment process, hardcoded API URLs, backend crash due to docker-compose override. Need automated pipeline.
- **Options considered**: (A) GitHub Actions + SSH deploy, (B) GitHub Actions + Docker Hub registry + pull, (C) Self-hosted runner on the server
- **Decision**: Option A — GitHub Actions with SSH deploy via `appleboy/ssh-action`. Simplest setup: push to main triggers lint+build check, then SSH to server to git pull and docker compose rebuild. No registry needed since builds happen on the server.
- **Consequences**:
  - New files: `.github/workflows/deploy.yml`, `.github/workflows/release.yml`, `frontend/nginx.conf`
  - Modified: `frontend/src/services/api.ts` (env var), `frontend/vite.config.ts` (dev proxy), `frontend/Dockerfile` (nginx.conf + build arg)
  - GitHub Secrets required: `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`, `DEPLOY_PATH`
  - Frontend nginx now handles SPA routing and API reverse proxy (no more hardcoded IPs)
  - Semantic versioning via git tags triggers auto GitHub Releases

## [2026-02-12] Initialize .agent/ documentation system

- **Agent**: claude-code
- **Context**: The project had specification documents in `Documents/` but no structured agent-readable documentation system
- **Options considered**: Keep using Documents/ only vs Adopt .agent-template structure
- **Decision**: Adopt the .agent-template system to provide a single source of truth for all AI agents (Claude, Codex, Gemini, Copilot), with all TODOs filled in based on existing project state
- **Consequences**: New `.agent/` directory with full project documentation. Entry files (CLAUDE.md, AGENTS.md, GEMINI.md, COPILOT.md) created at project root. Original `Documents/` preserved as reference
