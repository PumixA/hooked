# Git Conventions

> Single source of truth for all git-related rules. No other file should duplicate these.

---

## Branch Strategy (GitFlow)

```
main (production) <-- PR from dev only (or hotfix/*)
  ^
dev (pre-production) <-- PR from feature branches
  ^
feat/*, fix/*, docs/*, refactor/*, test/*, chore/*, hotfix/*
```

### Rules

- NEVER push directly to `main` or `dev`
- ALWAYS create a working branch from `dev`
- ALWAYS merge via Pull Request
- Hotfixes branch from `main`, merge back to both `main` and `dev`

### Branch Naming

| Type     | Pattern                 | Example                          |
| -------- | ----------------------- | -------------------------------- |
| Feature  | `feat/<short-name>`     | `feat/photo-gallery`             |
| Bug fix  | `fix/<short-name>`      | `fix/timer-reset`                |
| Docs     | `docs/<short-name>`     | `docs/api-reference`             |
| Refactor | `refactor/<short-name>` | `refactor/sync-service`          |
| Test     | `test/<short-name>`     | `test/offline-scenarios`         |
| Chore    | `chore/<short-name>`    | `chore/update-deps`              |
| Hotfix   | `hotfix/<short-name>`   | `hotfix/critical-sync-failure`   |

---

## Conventional Commits

### Format

```
<type>(<scope>): <lowercase description>

[optional body]

Co-Authored-By: <Agent Name> <noreply@provider.com>
```

### Types

`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

### Scopes

| Scope       | Description                                    |
| ----------- | ---------------------------------------------- |
| `frontend`  | React app general                              |
| `backend`   | Fastify API general                            |
| `ui`        | UI components, pages, layouts                  |
| `api`       | API routes and handlers                        |
| `db`        | Prisma schema, migrations, seeds               |
| `auth`      | Authentication (JWT, login, register)          |
| `sync`      | Synchronization engine (syncService, localDb)  |
| `offline`   | IndexedDB, offline data, useOfflineData        |
| `pwa`       | Service Worker, manifest, Workbox config       |
| `inventory` | Materials management                           |
| `projects`  | Project CRUD, counter, timer                   |
| `photos`    | Photo upload, gallery, base64 storage          |
| `notes`     | Notes CRUD                                     |
| `sessions`  | Timer sessions, weekly stats                   |
| `admin`     | Admin panel (user management)                  |
| `docker`    | Docker, docker-compose configuration           |
| `deps`      | Dependency updates                             |
| `ci`        | CI/CD pipeline                                 |
| `docs`      | Documentation (.agent/, Documents/)            |

### Rules

- Subject MUST be entirely lowercase
- Maximum 72 characters for the subject
- No period at the end of the subject
- Use imperative mood ("add feature" not "added feature")

### Co-Author Tags by Agent

| Agent       | Co-Author line                                                  |
| ----------- | --------------------------------------------------------------- |
| claude-code | `Co-Authored-By: Claude <noreply@anthropic.com>`                |
| codex       | `Co-Authored-By: Codex <noreply@openai.com>`                   |
| gemini      | `Co-Authored-By: Gemini <noreply@google.com>`                  |
| copilot     | `Co-Authored-By: GitHub Copilot <noreply@github.com>`           |

---

## Agent Permissions

### Automatic (no permission needed)

- `git add <files>`
- `git commit`
- `git status`, `git diff`, `git log`

### Requires User Permission

- `git checkout` / `git switch` (branch changes)
- `git push`
- `git merge`
- `git rebase`
- Any destructive operation (`reset --hard`, `push --force`, `branch -D`)

> IMPORTANT: Never chain checkout/push without stopping for user validation between each step.

---

## Pull Request Convention

### Title

- Short, under 70 characters
- Same format as commit subject: `<type>(<scope>): <description>`

### Body Template

```markdown
## Summary
- Bullet point description of changes

## Test Plan
- [ ] How to verify the changes work

---
Generated with AI assistance
```
