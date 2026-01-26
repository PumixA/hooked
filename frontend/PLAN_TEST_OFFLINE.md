# Plan de Test Offline-First - Hooked PWA

## Architecture Implémentée

```
┌─────────────────────────────────────────────────────────────┐
│                        UI (React)                           │
│     Dashboard, ProjectDetail, Inventory, Forms...           │
├─────────────────────────────────────────────────────────────┤
│                  Hooks Offline-First                        │
│   useProjects, useMaterials, usePhotos, useNote...          │
├────────────────────────┬────────────────────────────────────┤
│     IndexedDB Local    │         Sync Service               │
│     (Source de vérité) │     (Background sync)              │
├────────────────────────┴────────────────────────────────────┤
│                         API (Backup)                        │
│               Sert uniquement de sauvegarde                 │
└─────────────────────────────────────────────────────────────┘
```

## Fichiers Clés

- `src/services/localDb.ts` - Base de données IndexedDB
- `src/services/syncService.ts` - Service de synchronisation
- `src/hooks/useOfflineData.ts` - Hooks React pour accès aux données

---

## Outils de Debug (Console)

```javascript
// Base de données locale
window.__localDb.debugDump()         // Affiche tout le contenu
window.__localDb.getAllProjects()    // Liste des projets
window.__localDb.getAllMaterials()   // Liste des matériaux
window.__localDb.getPendingProjects() // Projets non synchronisés

// Synchronisation
window.__syncService.syncAll()       // Force une sync

// Cache React Query (ancien)
window.__hooked?.logCache()          // Log du cache RQ
```

---

# PLAN DE TEST PAGE PAR PAGE

## Préparation

1. Ouvrir l'app sur `http://localhost:5173`
2. Ouvrir DevTools (F12) > Console
3. Ouvrir DevTools > Network pour voir les appels
4. Ouvrir DevTools > Application > IndexedDB > `hooked-offline-db`

---

## 1. Dashboard (`/`)

### Test Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Charger la page | Liste des projets s'affiche | Console: pas d'erreur |
| Vérifier IndexedDB | Les projets sont stockés localement | Application > IndexedDB > projects |
| Pull-to-refresh | Sync avec l'API + reload | Network: GET /projects |
| Temps hebdo | Affiche le temps cumulé | Chiffre visible en haut |

### Test Offline ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Passer en mode avion | Badge "Hors ligne" apparaît | UI: badge orange |
| Recharger la page | Les projets s'affichent quand même | Données de IndexedDB |
| Pull-to-refresh | Aucun appel API | Network: rien |
| Renommer un projet (long press) | Modification immédiate | IndexedDB: `_syncStatus: 'pending'` |
| Supprimer un projet | Suppression immédiate | Projet disparaît |
| Badge "en attente" | Indique le nombre non sync | Header: "X en attente" |

### Test Retour Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Désactiver mode avion | Badge "Hors ligne" disparaît | UI |
| Pull-to-refresh | Sync automatique | Network: POST/PATCH vers API |
| Vérifier serveur | Données mises à jour | API ou base de données serveur |

---

## 2. Création de Projet (`/projects/new`)

### Test Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Remplir le formulaire | Champs fonctionnels | - |
| Choisir catégorie | Catégories depuis IndexedDB | Pas d'appel API si déjà en cache |
| Soumettre | Création immédiate | Redirection vers projet |
| Vérifier | Projet visible dans dashboard | IndexedDB + API sync |

### Test Offline ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Mode avion + créer projet | Message "Mode hors ligne" visible | Banner jaune |
| Soumettre | Création avec ID local (`local-xxx`) | ID commence par `local-` |
| Navigation | Redirection vers projet local | URL avec ID local |
| Dashboard | Projet visible avec badge "Non synchronisé" | Badge jaune |
| Vérifier IndexedDB | `_isLocal: true`, `_syncStatus: 'pending'` | Application > IndexedDB |

### Test Sync ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Revenir online | - | - |
| Sync | Projet créé sur serveur | Network: POST /projects |
| ID remplacé | L'ID local devient ID serveur | IndexedDB: ID changé |

---

## 3. Détail Projet (`/projects/:id`)

### Test Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Charger projet existant | Données affichées | Titre, compteur, timer |
| Incrémenter rang (+) | Compteur +1, sauvegarde | IndexedDB mis à jour |
| Démarrer timer | Timer tourne | Affichage temps |
| Arrêter timer | Session sauvegardée | IndexedDB sessions |
| Ajouter note | Note sauvegardée | IndexedDB notes |
| Ajouter photo | Photo uploadée | Galerie visible |

### Test Offline ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Mode avion | Badge offline visible | Header |
| Incrémenter rang | Fonctionne immédiatement | Compteur change |
| Timer | Fonctionne normalement | - |
| Modifier objectif | Sauvegarde locale | Settings |
| Ajouter note | Sauvegarde locale | Modal notes |
| Ajouter photo | Photo stockée en base64 | Badge "Local" sur photo |
| Terminer projet | Marqué comme complété | Badge vert |

### Test Sync ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Revenir online | - | - |
| Vérifier sync | Toutes modifs envoyées | Network |
| Photos uploadées | Upload vers serveur | Network: POST /photos |

---

## 4. Inventaire (`/inventory`)

### Test Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Charger la page | Liste des matériaux | - |
| Filtrer par type | Filtre fonctionne | Boutons filtres |
| Supprimer item | Suppression immédiate | Item disparaît |

### Test Offline ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Mode avion | Badge offline | Header |
| Liste visible | Données de IndexedDB | - |
| Filtres | Fonctionnent | - |
| Supprimer item | Suppression locale | Item disparaît + IndexedDB |

---

## 5. Création Matériel (`/inventory/new`)

### Test Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Remplir formulaire | - | - |
| Soumettre | Création + redirection | Inventaire |
| Vérifier | Matériel visible | Liste inventaire |

### Test Offline ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Mode avion | Badge "Hors ligne" | - |
| Bouton devient | "Ajouter hors ligne" | Texte du bouton |
| Soumettre | Création locale | IndexedDB |
| Vérifier | Matériel visible avec indicateur | Point jaune |

---

## 6. Édition Matériel (`/inventory/:id`)

### Test Online ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Charger | Données pré-remplies | Formulaire |
| Modifier | Sauvegarde | Redirection |

### Test Offline ✓

| Action | Attendu | Vérification |
|--------|---------|--------------|
| Mode avion | Badge visible | - |
| Charger | Données de IndexedDB | - |
| Modifier | Sauvegarde locale | - |
| Vérifier | Modif en attente | IndexedDB |

---

## Tests de Robustesse

### Test 1: Fermeture App en Offline

1. Passer en mode avion
2. Créer un projet + ajouter des rangs
3. Fermer complètement l'app (kill)
4. Rouvrir l'app (toujours offline)
5. **Attendu**: Toutes les données sont là

### Test 2: Sync après longue période offline

1. Mode avion pendant 5+ minutes
2. Faire plusieurs modifications
3. Repasser online
4. **Attendu**: Tout se synchronise

### Test 3: Création multiple offline

1. Mode avion
2. Créer 3 projets
3. Créer 2 matériaux
4. Modifier des projets existants
5. Repasser online
6. **Attendu**: Tout sync dans l'ordre

### Test 4: Photos offline

1. Mode avion
2. Ajouter 3 photos à un projet
3. Vérifier qu'elles s'affichent (base64 local)
4. Repasser online
5. **Attendu**: Photos uploadées sur serveur

### Test 5: Conflit de données

1. Modifier un projet sur le serveur directement
2. Modifier le même projet en offline sur l'app
3. Repasser online
4. **Attendu**: Last-write-wins (version locale écrase)

---

## Indicateurs Visuels

| État | Indicateur |
|------|------------|
| Offline | Badge orange "Hors ligne" |
| Données en attente | Badge jaune "X en attente" |
| Projet non synchronisé | Badge jaune sur la carte |
| Photo locale | Badge "Local" sur la photo |
| Projet terminé | Badge vert + coche |

---

## Checklist Finale

- [ ] Dashboard charge offline
- [ ] Création projet offline fonctionne
- [ ] Compteur de rangs offline fonctionne
- [ ] Timer offline fonctionne
- [ ] Notes offline fonctionnent
- [ ] Photos offline fonctionnent (stockage base64)
- [ ] Inventaire charge offline
- [ ] Création matériel offline fonctionne
- [ ] Édition matériel offline fonctionne
- [ ] Sync automatique au retour online
- [ ] Pas de perte de données après kill app
- [ ] Indicateurs visuels corrects

---

## Commandes Utiles

```bash
# Lancer en dev
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```
