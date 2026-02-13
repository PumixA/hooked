# Domain Glossary (Ubiquitous Language)

> Version: 2.2.0
>
> Every term in this glossary is the **canonical name** used in code, documentation, and communication.
> Using a different name for the same concept is a **breaking change**.

---

## How to Use This File

- Before writing code, check that your variable/function/class names match these terms
- When introducing a new concept, add it here FIRST, then use it in code
- Each term has: definition, type in code, and usage context

## Terms

### Project

- **Definition**: A knitting or crochet work being tracked by the user, with a row counter, timer, notes, and photos
- **Type**: `interface { id: string; title: string; current_row: number; goal_rows: number | null; status: ProjectStatus; category_id: string; increment_step: number; total_duration: number; cover_file_path?: string; cover_base64?: string; }`
- **Context**: Core entity. Displayed on Dashboard, managed in ProjectDetail
- **Synonyms to avoid**: task, item, work

### ProjectCover

- **Definition**: Optional visual cover image for a Project, configured from Project settings
- **Type**: `interface { cover_file_path?: string; cover_base64?: string; cover_sync_status?: 'synced' | 'pending'; }`
- **Context**: Dashboard card uses app logo by default; if a ProjectCover is defined, it is displayed instead and synchronized when cloud sync is active
- **Synonyms to avoid**: heroImage, banner, thumbnail

### Category

- **Definition**: A classification type for a Project (Pull, Bonnet, Echarpe, etc.)
- **Type**: `interface { id: string; label: string; icon_key: string; }`
- **Context**: Seeded at first launch. Used in project creation and display
- **Values**: Pull, Bonnet, Echarpe, Couverture, Gants, Sac, Amigurumi, Chaussettes, Gilet, Autre
- **Synonyms to avoid**: type, kind, group

### Material

- **Definition**: A physical crafting supply in the user's inventory (hook, yarn, or needle)
- **Type**: `interface { id: string; category_type: MaterialType; name: string; size?: string; brand?: string; material_composition?: string; }`
- **Context**: Managed in Inventory pages. Can be linked to Projects via project_materials
- **Synonyms to avoid**: item, supply, tool, equipment

### MaterialType (category_type)

- **Definition**: The classification of a Material
- **Type**: `'hook' | 'yarn' | 'needle'`
- **Context**: Used as filter chips in Inventory page
- **Synonyms to avoid**: material_category, type

### Session

- **Definition**: A timed working period on a Project, recorded by the built-in stopwatch
- **Type**: `interface { id: string; project_id: string; start_time: string; end_time: string | null; duration_seconds: number; }`
- **Context**: Created when timer stops. Used for weekly stats on Dashboard
- **Synonyms to avoid**: timer, period, timeEntry

### Note

- **Definition**: A free-text annotation attached to a specific Project
- **Type**: `interface { id: string; project_id: string; content: string; }`
- **Context**: Managed in ProjectDetail page
- **Synonyms to avoid**: comment, memo, annotation

### Photo

- **Definition**: An image attached to a specific Project
- **Type**: `interface { id: string; project_id: string; file_path: string; base64?: string; }`
- **Context**: Uploaded via camera/gallery. Stored as base64 in IndexedDB when offline, as file on server when synced
- **Synonyms to avoid**: image, picture, media

### ProjectStatus

- **Definition**: The current lifecycle state of a Project
- **Type**: `'in_progress' | 'completed' | 'archived'`
- **Context**: Determines display and behavior in Dashboard and ProjectDetail
- **Synonyms to avoid**: state, phase

### User

- **Definition**: A registered account that can authenticate and sync data to the server
- **Type**: `interface { id: string; email: string; role: UserRole; theme_pref: ThemePref; }`
- **Context**: Authentication, cloud sync, admin management
- **Synonyms to avoid**: account, member

### UserRole

- **Definition**: The permission level of a User
- **Type**: `'user' | 'admin'`
- **Context**: Admin can manage other users via AdminUsers pages
- **Synonyms to avoid**: permission, level

### ThemePref

- **Definition**: The user's preferred UI theme
- **Type**: `'dark' | 'light' | 'warm'`
- **Context**: Stored in user preferences, applied via AppContext
- **Synonyms to avoid**: mode, colorScheme

---

## Sync-Specific Terms

### _syncStatus

- **Definition**: Metadata field on every entity indicating its synchronization state
- **Type**: `'synced' | 'pending' | 'conflict'`
- **Context**: Used by syncService to determine which items to push. UI shows indicators for 'pending'
- **Synonyms to avoid**: syncState, status (already used for ProjectStatus)

### _localUpdatedAt

- **Definition**: Client-side timestamp of the last modification. Used for Last Write Wins conflict resolution
- **Type**: `string` (ISO 8601 timestamp)
- **Context**: Compared with server's `updated_at` during merge
- **Synonyms to avoid**: modifiedAt, lastModified

### _isLocal

- **Definition**: Boolean flag indicating an entity was created offline and has never been synced to the server
- **Type**: `boolean`
- **Context**: Local entities have IDs starting with `local-`. Replaced with server UUID after first sync
- **Synonyms to avoid**: isOffline, isNew

### Local ID

- **Definition**: A temporary ID in the format `local-xxx` assigned to entities created while offline
- **Type**: `string` (prefix: `local-`)
- **Context**: Replaced by server-generated UUID after successful sync push
- **Synonyms to avoid**: tempId, offlineId
