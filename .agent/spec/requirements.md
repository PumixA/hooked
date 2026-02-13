# Functional Requirements

> Version: 2.1.0

---

## Project Vision

**Hooked** est une PWA offline-first dediee au suivi de projets de crochet et de tricot. Elle fonctionne 100% hors ligne par defaut et offre une synchronisation cloud optionnelle pour les utilisateurs qui souhaitent sauvegarder leurs donnees sur un serveur auto-heberge.

## Personas

| Persona       | Description                                  | Key needs                                                |
| ------------- | -------------------------------------------- | -------------------------------------------------------- |
| **Crafter**   | Personne pratiquant le tricot ou le crochet   | Suivi de progression, compteur de rangs, timer, inventaire |
| **Admin**     | Administrateur du serveur auto-heberge        | Gestion des utilisateurs, monitoring                      |

## Features

### F1: Dashboard (Tableau de Bord)

**Priority**: HIGH

**User stories**:
- As a Crafter, I want to see my active projects at a glance, so that I can quickly resume work
- As a Crafter, I want to see my weekly knitting time, so that I can track my activity

**Acceptance criteria**:
- [ ] Display weekly crafting time stats
- [ ] Show last opened project as featured (large card)
- [ ] Grid of other projects with progress bars
- [ ] FAB button (+) for quick project creation
- [ ] Orange badge "Hors ligne" when offline
- [ ] Yellow badge showing pending sync count

### F2: Project Management (Counter)

**Priority**: HIGH

**User stories**:
- As a Crafter, I want a giant row counter, so that I can easily track my progress
- As a Crafter, I want a built-in timer, so that I can track time spent per session

**Acceptance criteria**:
- [ ] Giant counter displaying current row
- [ ] Violet (+) button to increment by `increment_step`
- [ ] Discreet (-) button to decrement
- [ ] Integrated stopwatch with start/pause/stop
- [ ] Session recording (start_time, end_time, duration)
- [ ] Project status: in_progress, completed, archived
- [ ] Notes (free text per project)
- [ ] Photo gallery per project

### F3: Project Creation (Wizard)

**Priority**: HIGH

**User stories**:
- As a Crafter, I want to create a project quickly, so that I can start tracking immediately

**Acceptance criteria**:
- [ ] Title, category selection, optional goal rows
- [ ] Categories: Pull, Bonnet, Echarpe, Couverture, Gants, Sac, Amigurumi, Chaussettes, Gilet, Autre
- [ ] Configurable increment step (default: 1)

### F4: Inventory Management

**Priority**: MEDIUM

**User stories**:
- As a Crafter, I want to catalog my materials, so that I know what I have available

**Acceptance criteria**:
- [ ] Filter chips: Tout / Crochets / Laine / Aiguilles
- [ ] Material cards with name, brand, composition
- [ ] Quick add form per material type
- [ ] Associate materials with projects (junction table)

### F5: Offline-First Data

**Priority**: HIGH

**User stories**:
- As a Crafter, I want the app to work without internet, so that I can use it anywhere

**Acceptance criteria**:
- [ ] All data stored in IndexedDB
- [ ] App installable as PWA
- [ ] Works 100% without network
- [ ] Default categories injected at first launch
- [ ] Photos stored as base64 in IndexedDB when offline
- [ ] Local IDs (`local-xxx`) for offline-created entities

### F6: Cloud Sync (Optional)

**Priority**: MEDIUM

**User stories**:
- As a Crafter, I want to sync my data to a server, so that I can access it from multiple devices

**Acceptance criteria**:
- [ ] Login/Register with email/password
- [ ] Toggle sync on/off in Settings
- [ ] Push pending changes to API
- [ ] Pull new data from server
- [ ] Last Write Wins conflict resolution
- [ ] Visual indicators for pending sync items

### F7: Settings

**Priority**: MEDIUM

**Acceptance criteria**:
- [ ] Show current mode (Local/Cloud)
- [ ] Connect/disconnect account
- [ ] Enable/disable cloud sync toggle
- [ ] Clear local data option

### F8: Admin Panel

**Priority**: LOW

**User stories**:
- As an Admin, I want to manage user accounts, so that I can control access

**Acceptance criteria**:
- [ ] User list page
- [ ] User detail/edit page
- [ ] Role management (user/admin)

---

## Non-Functional Requirements

| Category      | Requirement                                | Target                          |
| ------------- | ------------------------------------------ | ------------------------------- |
| Performance   | App loads and is usable offline             | < 3s first paint                |
| Security      | JWT auth, HTTPS for SW + camera            | OWASP Top 10 compliance        |
| Accessibility | Usable on mobile with one hand             | Large touch targets, high contrast |
| Scalability   | Self-hosted for personal use               | 1-5 concurrent users            |
| PWA           | Installable, works offline                 | Lighthouse PWA score > 90       |
