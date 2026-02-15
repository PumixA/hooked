# Agent Changelog

> Append-only log of all agent actions. Every AI agent MUST add an entry after each modification.
>
> **Format**: `[YYYY-MM-DD HH:MM] <agent-id> | <type>(<scope>): <description>`
>
> **Valid agent IDs**: `claude-code`, `codex`, `gemini`, `copilot`, `human`
>
> **Valid types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

---

<!-- Entries below this line. Group by date. Most recent date on top. -->

## 2026-02-15

- [2026-02-15 23:07] codex | chore(git): prepare commit for material details and counter reset
- [2026-02-15 23:06] codex | docs(spec): document material details and counter reset behavior
- [2026-02-15 23:03] codex | feat(projects): add reset-to-zero button on project counter screen
- [2026-02-15 22:59] codex | fix(inventory): add free-text material description field (offline-first + sync)
- [2026-02-15 22:49] codex | fix(inventory): show size in titles and replace descriptif fields (color/yardage/grammage)
- [2026-02-15 22:32] codex | feat(inventory): add material descriptifs and project-level manage menu for add/remove
- [2026-02-15 22:12] codex | fix(docker): generate prisma client before typescript build in backend image
- [2026-02-15 21:59] codex | feat(projects): allow steps without target rows and add in-page step switching + description display
- [2026-02-15 21:46] codex | feat(projects): move step management into counter screen and give each step its own counter
- [2026-02-15 21:37] codex | feat(projects): add step-by-step project flow with per-step targets and instruction memo (offline-first + sync)
- [2026-02-15 21:21] codex | fix(pwa): keep lockscreen counter alive with service worker active state and robust app-open handling
- [2026-02-15 21:11] codex | fix(pwa): trigger lockscreen counter notification from user gesture with dual path (direct + service worker mirror)

## 2026-02-13

- [2026-02-13 20:36] codex | fix(pwa): make lockscreen counter notification persistent with periodic refresh and safer lifecycle handling
- [2026-02-13 20:26] codex | fix(ui): restore page scrolling, fix project cover fallback, preprod badge, and live +/- lockscreen counter actions
- [2026-02-13 20:04] codex | chore(git): commit v2.1 stability, cover sync, and notification foundation changes on fix/android-timer-dashboard-stability
- [2026-02-13 19:24] codex | fix(ui): remove dashboard row counters, reduce residual scroll, and re-enable login entry in settings
- [2026-02-13 18:59] codex | fix(pwa): switch to hash routing and stabilize android reload + timer runtime persistence
- [2026-02-13 18:59] codex | feat(projects): add project cover upload/remove with offline-first sync support
- [2026-02-13 18:59] codex | feat(pwa): add lockscreen notification action foundation via service worker messaging
- [2026-02-13 18:59] codex | docs(docs): update requirements/design/features/decisions for v2.1 stability and cover flow
- [2026-02-13 11:40] claude-code | chore(git): clean up ~30 obsolete branches (feature/hook-*, fixes, temporaryProd, develop)
- [2026-02-13 11:40] human | chore(git): configure branch protection rules on GitHub (main: PR + 1 approval + CI, dev: PR + CI)
- [2026-02-13 11:20] claude-code | docs(agent): update all .agent/ docs with preprod environment, DNS, network config
- [2026-02-13 11:10] claude-code | feat(infra): add preprod environment — docker-compose.preprod.yml, deploy-preprod.yml workflow, nginx.conf.template with envsubst
- [2026-02-13 11:00] claude-code | feat(infra): configure OVH DNS + NPM proxy host + Let's Encrypt DNS challenge for hooked-preprod.melvin-delorme.fr
- [2026-02-13 10:30] claude-code | ci(deploy): switch deploy job from SSH to self-hosted GitHub Actions runner
- [2026-02-13 10:20] claude-code | chore(server): install and configure self-hosted GitHub Actions runner as systemd service
- [2026-02-13 09:20] claude-code | fix(backend): copy Prisma generated client to production Docker stage
- [2026-02-13 09:00] claude-code | chore(server): setup production server — clone repo, restore data, configure SSH deploy key
- [2026-02-13 08:30] claude-code | chore(git): migrate remote from hooked-pwa.git to hooked.git, tag v1.0.0
- [2026-02-13 08:00] claude-code | fix(frontend): fix 143 ESLint errors — replace all `any` types with proper TypeScript types across 15 files
- [2026-02-13 07:30] claude-code | chore(git): remove .env.prod and dev-dist/ from git tracking (security + cleanup)

## 2026-02-12

- [2026-02-12 21:00] claude-code | ci(cicd): implement CI/CD pipeline with GitHub Actions deploy + release workflows
- [2026-02-12 21:00] claude-code | fix(frontend): replace hardcoded API URL with VITE_API_URL env variable + /api fallback
- [2026-02-12 21:00] claude-code | feat(frontend): add nginx.conf for SPA routing + API/uploads reverse proxy
- [2026-02-12 21:00] claude-code | fix(frontend): update Dockerfile to copy nginx.conf + inject VITE_API_URL build arg
- [2026-02-12 21:00] claude-code | feat(frontend): add Vite dev proxy for /api and /uploads
- [2026-02-12 21:00] claude-code | chore(gitignore): add .env.prod to gitignore
- [2026-02-12 21:00] claude-code | docs(cicd): update spec/cicd.md with full pipeline documentation
- [2026-02-12 19:30] claude-code | docs(docs): initialize .agent/ documentation system from agent-template, adapted to hooked project
