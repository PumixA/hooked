# System Architecture

> Version: 2.2.0

---

## Overview

Hooked is a PWA with an offline-first architecture. The client (React) is the primary data source via IndexedDB. The server (Fastify + PostgreSQL) serves as an optional cloud backup.

```mermaid
graph TD
    subgraph Client["Client (PWA)"]
        UI[React UI + Pages]
        Hooks[useOfflineData Hook]
        IDB[(IndexedDB)]
        SW[Service Worker / Workbox]
    end

    subgraph Server["Server (Docker)"]
        API[Fastify API]
        ORM[Prisma ORM]
        DB[(PostgreSQL)]
        Uploads[/uploads/ Photos]
    end

    UI --> Hooks
    Hooks --> IDB
    Hooks -->|if sync enabled + online| SyncService
    SyncService -->|Push/Pull| API
    API --> ORM
    ORM --> DB
    API --> Uploads
    SW -->|Cache static assets| UI
```

## Component Diagram

### Frontend Architecture

```mermaid
graph TD
    subgraph Providers["React Context Tree"]
        App[AppProvider]
        Auth[AuthProvider]
        Sync[SyncProvider]
    end

    subgraph Pages
        Dashboard
        ProjectCreate
        ProjectDetail
        Inventory
        MaterialCreate
        MaterialEdit
        Settings
        Login
        AdminUsers
        AdminUserDetail
    end

    subgraph Services
        localDb["localDb.ts (IndexedDB)"]
        syncService["syncService.ts"]
        api["api.ts (Axios)"]
    end

    subgraph Hooks
        useOfflineData
        useSafeMutation
    end

    App --> Auth --> Sync
    Pages --> Hooks
    Hooks --> localDb
    Hooks --> syncService
    syncService --> api
    syncService --> localDb
```

### Backend Architecture

```mermaid
graph LR
    subgraph Fastify["Fastify Server"]
        CORS[CORS Middleware]
        JWT[JWT Auth Plugin]
        Routes[Route Handlers]
    end

    subgraph RouteFiles["Routes"]
        AuthR[auth.ts]
        UsersR[users.ts]
        ProjectsR[projects.ts]
        MaterialsR[materials.ts]
        SessionsR[sessions.ts]
        PhotosR[photos.ts]
        NotesR[notes.ts]
    end

    Routes --> AuthR & UsersR & ProjectsR & MaterialsR & SessionsR & PhotosR & NotesR
    RouteFiles --> Prisma[Prisma Client]
    Prisma --> PostgreSQL[(PostgreSQL)]
```

## Data Flow

### Offline-First Read Flow

```
1. Component calls useOfflineData("projects")
2. Hook reads from localDb (IndexedDB) — ALWAYS
3. Data returned to component immediately
4. If sync enabled + online: background sync pulls latest from API
5. New data merged into IndexedDB (Last Write Wins)
6. React Query cache invalidated → UI re-renders
```

### Offline-First Write Flow

```
1. User action (e.g., increment counter)
2. useSafeMutation writes to localDb (IndexedDB)
3. Entity marked: _syncStatus = 'pending', _localUpdatedAt = now
4. UI updates immediately (optimistic)
5. If sync enabled + online:
   a. syncService pushes pending items to API
   b. Server responds with server-side IDs
   c. localDb updates: _syncStatus = 'synced', replace local-xxx IDs
```

### Sync Process (Push → Pull → Merge)

```mermaid
sequenceDiagram
    participant IDB as IndexedDB
    participant Sync as syncService
    participant API as Fastify API
    participant PG as PostgreSQL

    Note over Sync: Triggered if: auth + sync toggle + online

    Sync->>IDB: Get pending items (_syncStatus = 'pending')
    IDB-->>Sync: Pending entities
    Sync->>API: POST/PATCH pending entities
    API->>PG: Upsert
    PG-->>API: Saved entities (with server IDs)
    API-->>Sync: Response
    Sync->>IDB: Update: _syncStatus = 'synced'

    Sync->>API: GET all entities (pull)
    API->>PG: SELECT
    PG-->>API: All user data
    API-->>Sync: Server entities
    Sync->>IDB: Merge (Last Write Wins on updated_at)
```

## Entity Relationships

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR role "user | admin"
        VARCHAR theme_pref "dark | light | warm"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    categories {
        UUID id PK
        VARCHAR label
        VARCHAR icon_key "Lucide icon name"
    }

    projects {
        UUID id PK
        UUID user_id FK "nullable (local mode)"
        UUID category_id FK
        VARCHAR title
        VARCHAR status "in_progress | completed | archived"
        INT current_row
        INT goal_rows "nullable"
        INT increment_step "default 1"
        INT total_duration
        TIMESTAMPTZ start_date
        TIMESTAMPTZ end_date "nullable"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    materials {
        UUID id PK
        UUID user_id FK "nullable"
        VARCHAR category_type "hook | yarn | needle"
        VARCHAR name
        VARCHAR size
        VARCHAR brand
        VARCHAR material_composition
        TIMESTAMPTZ updated_at
    }

    sessions {
        UUID id PK
        UUID project_id FK
        TIMESTAMPTZ start_time
        TIMESTAMPTZ end_time "nullable (active if NULL)"
        INT duration_seconds
    }

    notes {
        UUID id PK
        UUID project_id FK
        TEXT content
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    photos {
        UUID id PK
        UUID project_id FK
        VARCHAR file_path
        TIMESTAMPTZ created_at
    }

    project_materials {
        UUID project_id FK
        UUID material_id FK
    }

    users ||--o{ projects : owns
    users ||--o{ materials : owns
    categories ||--o{ projects : categorizes
    projects ||--o{ sessions : tracks
    projects ||--o{ notes : has
    projects ||--o{ photos : has
    projects }o--o{ materials : uses
```

## API Endpoints

| Method   | Path                      | Description                    | Auth     |
| -------- | ------------------------- | ------------------------------ | -------- |
| POST     | `/auth/login`             | JWT authentication             | No       |
| POST     | `/auth/register`          | Create account                 | No       |
| GET      | `/users/me`               | Current user profile           | Required |
| PATCH    | `/users/me`               | Update preferences             | Required |
| GET      | `/projects`               | List user projects             | Required |
| POST     | `/projects`               | Create project                 | Required |
| GET      | `/projects/:id`           | Get project details            | Required |
| PATCH    | `/projects/:id`           | Update project                 | Required |
| DELETE   | `/projects/:id`           | Delete project + related data  | Required |
| GET      | `/materials`              | List materials (?category_type)| Required |
| POST     | `/materials`              | Add material                   | Required |
| PATCH    | `/materials/:id`          | Update material                | Required |
| DELETE   | `/materials/:id`          | Delete material                | Required |
| POST     | `/sessions`               | Record timer session           | Required |
| GET      | `/sessions/weekly`        | Weekly total time              | Required |
| GET      | `/photos?project_id=`     | List project photos            | Required |
| POST     | `/photos?project_id=`     | Upload photo (multipart)       | Required |
| DELETE   | `/photos/:id`             | Delete photo                   | Required |
| GET      | `/notes?project_id=`      | Get project notes              | Required |
| POST     | `/notes`                  | Create/update note             | Required |
| DELETE   | `/notes/:id`              | Delete note                    | Required |
| GET      | `/categories`             | List categories                | Public   |

## Security Model

- **Authentication**: JWT tokens via `@fastify/jwt`
- **Password Storage**: bcrypt hashing
- **HTTPS**: Required for Service Workers and camera access
- **CORS**: Configured via `@fastify/cors`
- **Local Data**: IndexedDB, accessible only on the device
- **No passwords stored locally**: Only JWT token in localStorage
- **Role-based access**: `user` and `admin` roles
