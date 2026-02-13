# Tech Stack

> Version: 2.1.0
>
> Exact dependency versions. Agents MUST use these versions to avoid deprecated APIs.

---

## Runtime

| Tool       | Version  |
| ---------- | -------- |
| Node.js    | 20+ LTS  |
| npm        | 10+      |

## Frontend Dependencies

| Package                                    | Version   | Purpose                          |
| ------------------------------------------ | --------- | -------------------------------- |
| react                                      | 19.2.0    | UI framework                     |
| react-dom                                  | 19.2.0    | DOM rendering                    |
| react-router-dom                           | 7.12.0    | Client-side routing              |
| @tanstack/react-query                      | 5.90.20   | Server state management          |
| @tanstack/react-query-persist-client       | 5.90.22   | Query persistence                |
| @tanstack/query-sync-storage-persister     | 5.90.22   | LocalStorage query cache         |
| axios                                      | 1.13.2    | HTTP client                      |
| idb                                        | 8.0.3     | IndexedDB wrapper                |
| lucide-react                               | 0.562.0   | Icon library                     |
| tailwindcss                                | 3.4.17    | Utility-first CSS                |
| clsx                                       | 2.1.1     | Conditional classnames           |
| zod                                        | 4.3.5     | Schema validation                |
| bcrypt                                     | 6.0.0     | Password hashing (client-side)   |

## Backend Dependencies

| Package                | Version   | Purpose                          |
| ---------------------- | --------- | -------------------------------- |
| fastify                | 5.7.1     | HTTP framework                   |
| @fastify/jwt           | 10.0.0    | JWT authentication               |
| @fastify/cors          | 11.2.0    | CORS middleware                  |
| @fastify/multipart     | 9.4.0     | File upload handling             |
| @fastify/static        | 9.0.0     | Static file serving              |
| @prisma/client         | 6.19.2    | Database ORM client              |
| zod                    | 4.3.5     | Input validation                 |
| bcrypt                 | 6.0.0     | Password hashing                 |
| dotenv                 | 17.2.3    | Environment variables            |

## Dev Dependencies

| Package                        | Version   | Purpose                          |
| ------------------------------ | --------- | -------------------------------- |
| typescript                     | 5.9.3     | Type checking                    |
| vite                           | 7.2.4     | Build tool & dev server          |
| vite-plugin-pwa                | 1.2.0     | PWA generation (Workbox)         |
| @vitejs/plugin-react           | latest    | React fast refresh               |
| @vitejs/plugin-basic-ssl       | 2.1.4     | Dev HTTPS                        |
| eslint                         | 9.39.1    | Linting                          |
| typescript-eslint              | latest    | TS-specific lint rules           |
| postcss                        | 8.5.6     | CSS processing                   |
| autoprefixer                   | latest    | CSS vendor prefixes              |
| prisma                         | 6.19.2    | Prisma CLI                       |
| ts-node                        | latest    | TypeScript execution (backend)   |
| nodemon                        | latest    | Backend hot reload               |

## Infrastructure

| Service       | Version / Provider          | Purpose                     |
| ------------- | --------------------------- | --------------------------- |
| PostgreSQL    | 15+ (Docker)                | Relational database         |
| Docker        | Latest                      | Containerization            |
| Docker Compose| v2                          | Multi-container orchestration|
| Adminer       | Latest (Docker)             | Database admin UI (dev)     |
| Nginx Proxy Manager | Latest                | HTTPS reverse proxy (prod)  |
| GitHub Actions Runner | 2.331.0             | Self-hosted CI/CD deploy    |

## Dev Commands

### Frontend (`hooked-pwa/frontend/`)

```bash
npm install         # Install dependencies
npm run dev         # Start Vite dev server (hot reload)
npm run build       # TypeScript check + production build
npm run lint        # ESLint check
npm run preview     # Preview production build
```

### Backend (`hooked-pwa/backend/`)

```bash
npm install                   # Install dependencies
npm run dev                   # Start with nodemon (hot reload)
npm run build                 # Compile TypeScript
npm run create-admin          # Create admin user
npx prisma migrate dev        # Run database migrations
npx prisma db seed            # Seed default categories
npx prisma generate           # Regenerate Prisma client
npx prisma studio             # Visual database editor
```

### Docker

```bash
docker compose up -d                                    # Start dev (DB + Adminer)
docker compose -f docker-compose.prod.yml up -d         # Start production
docker compose down                                     # Stop services
docker compose logs -f                                  # View logs
```

## Known Issues

- `ProjectDetail.tsx` is ~39.5KB (largest file) — consider splitting in future refactors
- `localDb.ts` and `syncService.ts` are ~30KB each — complex but functional
- No automated tests yet — manual testing via `PLAN_TEST_OFFLINE.md`
- bcrypt is included in frontend `package.json` but may not be needed client-side
