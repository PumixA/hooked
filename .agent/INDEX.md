# INDEX.md — Navigation & Decision Tree

> Use this file to determine which documents to read based on your task.

---

## Document Map

| File                       | Priority | When to read                          |
| -------------------------- | -------- | ------------------------------------- |
| `AGENT.md`                 | ALWAYS   | Before any action                     |
| `wiki/domain.md`           | HIGH     | Before writing any code               |
| `tech/stack.md`            | HIGH     | Before adding imports or dependencies |
| `conventions/git.md`       | HIGH     | Before any git operation              |
| `conventions/code.md`      | HIGH     | Before writing code                   |
| `spec/requirements.md`     | MEDIUM   | When implementing features            |
| `spec/design.md`           | MEDIUM   | When modifying architecture           |
| `spec/features/*.feature`  | MEDIUM   | When implementing/testing behavior    |
| `spec/cicd.md`             | LOW      | When modifying CI/CD pipelines        |
| `conventions/docs.md`      | LOW      | When updating documentation           |
| `links/resources.md`       | LOW      | When needing external references      |
| `history/CHANGELOG.md`     | ON WRITE | After every action (append)           |
| `history/DECISIONS.md`     | ON WRITE | After architectural decisions         |

---

## Decision Tree

### "I need to understand the project"
1. `AGENT.md` (identity, principles)
2. `spec/requirements.md` (what the project does)
3. `spec/design.md` (how it's built)
4. `wiki/domain.md` (vocabulary)

### "I need to implement a feature"
1. `AGENT.md` (checklist)
2. `wiki/domain.md` (correct naming)
3. `tech/stack.md` (versions, avoid deprecated APIs)
4. `conventions/code.md` (style rules)
5. `spec/features/*.feature` (expected behavior)
6. `spec/requirements.md` (user stories)

### "I need to fix a bug"
1. `spec/design.md` (understand the component)
2. `tech/stack.md` (check known issues)
3. `conventions/code.md` (follow style)
4. `history/CHANGELOG.md` (recent changes that may have caused it)

### "I need to work on the offline/sync system"
1. `spec/design.md` (offline-first architecture, sync flow)
2. `wiki/domain.md` (sync terminology: _syncStatus, _isLocal, etc.)
3. `tech/stack.md` (idb, TanStack Query versions)

### "I need to commit / push / create a PR"
1. `conventions/git.md` (branch names, commit format, workflow)

### "I need to add a dependency"
1. `tech/stack.md` (check existing deps, add new one)

### "I need to make an architectural decision"
1. `spec/design.md` (current architecture)
2. `history/DECISIONS.md` (past decisions for context)
3. After deciding: append to `history/DECISIONS.md`

---

## Project Structure Quick Reference

```
hooked-pwa/
├── backend/          # Node.js Fastify API + Prisma ORM
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   └── routes/           # API route handlers
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── uploads/              # Photo storage
│
├── frontend/         # React 19 + Vite PWA
│   ├── src/
│   │   ├── pages/            # Route pages
│   │   ├── components/       # UI components
│   │   ├── services/         # localDb, syncService, api
│   │   ├── hooks/            # useOfflineData, useSafeMutation
│   │   ├── context/          # AppContext, AuthContext, SyncContext
│   │   └── layouts/          # AppLayout
│   └── public/               # PWA assets
│
├── database/         # PostgreSQL init
├── docker-compose.yaml       # Dev environment
└── docker-compose.prod.yml   # Production environment
```

---

## Pre-Implementation Checklist

Before writing any code:

1. [ ] I identified the correct domain terms in `wiki/domain.md`
2. [ ] I checked dependency versions in `tech/stack.md`
3. [ ] I read the relevant `.feature` files if they exist
4. [ ] I understand the architecture from `spec/design.md`
5. [ ] I know the code conventions from `conventions/code.md`
6. [ ] I know the git workflow from `conventions/git.md`
