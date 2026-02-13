# Code Conventions

> Rules for writing code in this project. All agents must follow these.

---

## General Principles

- **Strict typing**: Never use `any` in TypeScript
- **Immutability**: Prefer `const`, avoid mutation
- **Pure functions**: Minimize side effects
- **Small functions**: Max ~50 lines per function
- **Small files**: Max ~300 lines per file (some existing files exceed this — do not make it worse)
- **No over-engineering**: Only build what's needed now
- **Offline-First**: All data operations go through IndexedDB first; API is secondary

## File Naming

| Type        | Convention   | Example                    |
| ----------- | ------------ | -------------------------- |
| Pages       | PascalCase   | `ProjectDetail.tsx`        |
| Components  | PascalCase   | `BottomNavBar.tsx`         |
| Hooks       | camelCase    | `useOfflineData.ts`        |
| Services    | camelCase    | `syncService.ts`           |
| Context     | PascalCase   | `AuthContext.tsx`           |
| Utilities   | camelCase    | `cacheLogger.ts`           |
| Types       | PascalCase   | `GameSession.ts`           |
| Constants   | UPPER_SNAKE  | `MAX_ROWS`                 |
| Test files  | `.test.ts`   | `syncService.test.ts`      |

## Directory Structure (Frontend)

```
src/
├── pages/          # Route-level components (one per route)
├── components/
│   ├── ui/         # Generic reusable UI (Button, Card, Input, Modal)
│   └── features/   # Feature-specific components (Timer)
├── services/       # Business logic, data access, sync
├── hooks/          # Custom React hooks
├── context/        # React Context providers
└── layouts/        # Layout wrappers (AppLayout)
```

## Code Style

- ESLint 9 + TypeScript ESLint for linting
- Single quotes for strings (no semicolons rule not enforced — follow existing file style)
- Trailing commas in multiline structures
- 2-space indentation
- Tailwind CSS for styling — no CSS modules, no styled-components
- Lucide React for all icons

## React Patterns

- Functional components only (no class components)
- Context for global state: `AppContext`, `AuthContext`, `SyncContext`
- TanStack React Query for server state caching
- Custom hooks for data access (`useOfflineData`)
- React Router DOM v7 for routing

## Data Access Pattern

```
UI Component
  → useOfflineData hook (or useSafeMutation)
    → localDb service (IndexedDB — always)
    → syncService (API — only if cloud sync enabled + online)
```

- NEVER call the API directly from components
- ALWAYS go through localDb for reads
- Mutations go through localDb first, then sync pushes to API

## Error Handling

- Validate at system boundaries (API input with Zod, user forms)
- Trust internal code — don't over-validate between services
- Use typed errors, not generic strings
- Never swallow errors silently
- Offline errors are expected — handle gracefully with UI indicators

## Security

- Validate all API input with Zod schemas
- Never commit secrets (`.env`, credentials)
- JWT stored in localStorage (acceptable for self-hosted PWA)
- bcrypt for password hashing (backend)
- HTTPS required for Service Workers and camera access

## Testing

- Unit tests for business logic (sync, offline data)
- Manual testing guide: `frontend/PLAN_TEST_OFFLINE.md`
- Debug tools available in browser console (see `window.__localDb`, `window.__syncService`)
