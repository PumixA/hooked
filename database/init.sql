-- Active l'extension pour générer des UUIDs automatiquement
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table Utilisateurs
CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(20) DEFAULT 'user',
                       theme_pref VARCHAR(20) DEFAULT 'dark', -- 'dark', 'light', 'warm'
                       created_at TIMESTAMPTZ DEFAULT NOW(),
                       updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table Catégories (Référentiel)
CREATE TABLE categories (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            label VARCHAR(50) NOT NULL,
                            icon_key VARCHAR(50) -- Nom de l'icône Lucide (ex: 'shirt')
);

-- 3. Table Matériaux (Inventaire)
CREATE TABLE materials (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                           category_type VARCHAR(20) NOT NULL, -- 'hook', 'yarn', 'needle'
                           name VARCHAR(100) NOT NULL,
                           size VARCHAR(20),
                           brand VARCHAR(100),
                           material_composition VARCHAR(100),
                           updated_at TIMESTAMPTZ DEFAULT NOW() -- Vital pour la synchro
);

-- 4. Table Projets (Cœur du système)
CREATE TABLE projects (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                          category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
                          title VARCHAR(150) NOT NULL,
                          status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'archived'
                          current_row INTEGER DEFAULT 0,
                          goal_rows INTEGER, -- NULL si pas d'objectif
                          increment_step INTEGER DEFAULT 1,
                          start_date TIMESTAMPTZ DEFAULT NOW(),
                          end_date TIMESTAMPTZ,
                          created_at TIMESTAMPTZ DEFAULT NOW(),
                          updated_at TIMESTAMPTZ DEFAULT NOW() -- Vital pour la synchro
);

-- 5. Table de liaison Projet <-> Matériel
CREATE TABLE project_materials (
                                   project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                                   material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
                                   PRIMARY KEY (project_id, material_id)
);

-- 6. Sessions (Chronomètre)
CREATE TABLE sessions (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                          start_time TIMESTAMPTZ NOT NULL,
                          end_time TIMESTAMPTZ,
                          duration_seconds INTEGER DEFAULT 0
);

-- 7. Notes
CREATE TABLE notes (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                       content TEXT,
                       created_at TIMESTAMPTZ DEFAULT NOW(),
                       updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Photos
CREATE TABLE photos (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                        file_path VARCHAR(255) NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- DONNÉES PAR DÉFAUT (SEED) ---

-- On insère les catégories de base pour ne pas démarrer vide
INSERT INTO categories (label, icon_key) VALUES
                                             ('Pull', 'shirt'),
                                             ('Bonnet', 'smile'),
                                             ('Echarpe', 'scroll'),
                                             ('Couverture', 'layout-grid'),
                                             ('Gants', 'hand'),
                                             ('Sac', 'shopping-bag'),
                                             ('Amigurumi', 'toy-brick'),
                                             ('Autre', 'box');