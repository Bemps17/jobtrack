# Roadmap JobTrack

Suivi de candidatures — **monorepo** basé sur **Next.js 15** (UI + API intégrées). Ce document décrit l’**état du produit (v0.1.0)**, des **axes d’amélioration** et une **planification indicative** (sans engagement de date).

---

## Dépôt et version

| Élément | Détail |
|---------|--------|
| **Version produit** | **0.1.0** (`apps/web/package.json`, `src/lib/version.ts`) |
| **Dépôt** | [github.com/Bemps17/jobtrack](https://github.com/Bemps17/jobtrack) |
| **Description** | Application pour suivre les candidatures, offres et avancement dans le recrutement |

---

## Structure monorepo (v0.1.0)

| Dossier | Rôle |
|---------|------|
| `apps/web/` | **Next.js 15** (App Router, React 19, TypeScript, Tailwind 4). UI + **Route Handlers** `app/api/*`. |
| `apps/web/public/` | `manifest.webmanifest`, `icons/` ; **`sw.js`** généré au build (**PWA** ; désactivé en `next dev`). |
| `apps/web/data/` | `candidatures.json` (gitignored) — persistance locale si les variables Supabase serveur ne sont pas définies. |
| `apps/web/.env.example` | Variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (et optionnellement clé anon) — voir fichier. |
| `archive/legacy-express-api/` | Ancienne API Express (référence). |
| `archive/legacy-static-web/` | Ancienne SPA HTML/JS. |
| `.cursor/rules/` | Règles Cursor projet (version 0.1.0, conventions). |

**Démarrage** : à la racine — `npm install`, `npm run dev` → [http://localhost:3000](http://localhost:3000) (autre port si 3000 occupé). **Production / PWA** : `npm run build` puis `npm run start` — service worker actif hors développement.

---

## Livré en v0.1.0 (récapitulatif)

- Application **React** (pages `/`, `/list`, `/relances`), layout responsive, thème clair/sombre.
- **KPIs**, pipeline, liste récente, filtres / tri, vue **Relances**, CRUD + modales (détail, formulaire, import CSV, doublons).
- **API** : `GET` / `PUT` `/api/candidatures`, `GET` `/api/health` (inclut la version).
- **Persistance** : fichier JSON côté serveur Next par défaut ; **Supabase** (`public.candidatures`) lorsque `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définis (accès via **service role** dans les Route Handlers uniquement, MVP).
- **PWA** : manifest + workbox via `@ducanh2912/next-pwa`.
- Code métier structuré en **`src/lib/*`**, **`src/context/*`**, **`src/components/*`** (plus de monolithe `app.js` côté prod).

---

## État actuel (limites connues)

- **Données** : JSON local ou table Supabase selon l’environnement — pas de multi-utilisateurs ni résolution de conflits (RLS activée côté projet sans policies tant que tout passe par la service role).
- **CSV** : en-têtes sensibles à la casse / nom exact des colonnes (`company`, `job_title`, …).
- **Qualité** : pas de suite de tests automatisés ; peu de couverture accessibilité (focus modales, Escape global, etc.).
- **Sécurité** : pas d’authentification — usage personnel / réseau de confiance recommandé si exposé.

---

## Améliorations proposées (par thème)

### Données et fiabilité

| Idée | Intérêt |
|------|---------|
| **Export / import JSON** (même schéma que l’API) | Sauvegarde manuelle, migration, restauration. |
| **Version de schéma** dans le JSON stocké + migration légère | Évolutions de champs sans casser les anciens fichiers. |
| **Normalisation des en-têtes CSV** | Accepter `Company`, alias, trim — moins d’échecs d’import. |
| **`_updatedAt`** systématique sur les enregistrements modifiés | Tri et audit. |
| **Filet offline** (`localStorage` / cache) en complément | Tolérance aux coupures réseau ; sync ultérieure optionnelle. |

### Expérience utilisateur

| Idée | Intérêt |
|------|---------|
| **Relances calendaires** : « à traiter aujourd’hui / cette semaine » (`follow_up_date`) | Complète la vue Relances déjà existante. |
| **Recherche élargie** (notes, source, email) | Au-delà entreprise + intitulé de poste. |
| **Vue Kanban** par statut | Lecture pipeline alternative. |
| **Accessibilité** : focus piégé, `aria-live` toasts, fermeture Escape / overlay | WCAG, clavier, lecteurs d’écran. |

### Technique et maintenance

| Idée | Intérêt |
|------|---------|
| **Tests unitaires** (`vitest` / `node:test`) sur `norm`, `mapRow`, `isDuplicate`, `mergeCandidatures`, routes API | Régressions import / doublons. |
| **CI** (GitHub Actions) : `lint`, `build` sur chaque push | Qualité sur le dépôt public. |
| **Postgres (Supabase)** | Branché en option (sync liste complète `GET`/`PUT` `/api/candidatures`). Multi-user + RLS par `user_id` reste à faire si besoin. |
| **Déploiement** documenté (Vercel, Docker, VPS) | Reproductibilité hors machine locale. |

### Évolution produit (optionnel, plus tard)

| Idée | Intérêt |
|------|---------|
| Compte / **sync cloud** | Multi-appareil. |
| **Extension navigateur** « ajouter l’offre depuis l’onglet » | Gain de temps. |
| **Statistiques** (délais par étape, conversion) | Pilotage de la recherche. |

---

## Roadmap par phases

### Phase 1 — Stabilité et confiance *(court terme)*

1. ~~Persistance serveur + chargement au démarrage~~ — **fait** (Next + `candidatures.json`).
2. **Export / import JSON** (UI + téléchargement ou endpoint dédié).
3. **Robustesse CSV** : en-têtes normalisés, messages d’erreur homogènes, encodage.
4. **CI** GitHub Actions : au minimum `npm run build` sur `main`.

**Indicateur de succès** : sauvegarde JSON rejouable ; build vert sur le dépôt distant.

### Phase 2 — Usage quotidien *(moyen terme)*

1. Encart ou filtre **relances par date** (`follow_up_date`).
2. **Recherche étendue** aux notes et métadonnées.
3. **Accessibilité** modales et navigation clavier.
4. Aide in-app courte ou section README avancée (import, doublons, déploiement).

**Indicateur de succès** : parcours import → filtre → relance → export documenté et utilisable au clavier.

### Phase 3 — Qualité et extensibilité *(moyen / long terme)*

1. ~~Refactor modulaire + TypeScript~~ — **amorcé** (base actuelle) ; poursuivre découpage et réduction du « god context » si besoin.
2. ~~**PWA**~~ — **fait** (build prod) ; affiner icônes PNG multi-tailles si nécessaire stores / install.
3. Couverture **tests** ciblés + **lint** strict sur les PR.
4. **Base SQL** ou API externe si montée en charge ou besoin multi-utilisateurs.

**Indicateur de succès** : changement de règle métier (ex. doublon) couvert par au moins un test.

### Phase 4 — Vision *(long terme)*

- Auth, sync, Kanban avancé, intégrations calendrier / ATS.

---

## Principes directeurs

- **Une app Next** : API et front sur le même déploiement ; éviter de réintroduire un serveur Express parallèle sauf besoin spécifique.
- **Petites livraisons** : livrer des incréments utilisables ; incrémenter **semver** (0.2.0, …) quand le comportement public change.
- **Compatibilité des données** : migration ou champ `schemaVersion` dans le JSON lors des évolutions de modèle.

---

## Historique du document

| Version doc | Date | Notes |
|-------------|------|--------|
| 1.0 | 2026-03-29 | Première roadmap (SPA, restructuration fichiers). |
| 1.1 | 2026-03-29 | Monorepo, persistance, Express puis Next. |
| **1.2** | **2026-03-29** | Alignement **Next.js + PWA**, **v0.1.0**, dépôt **GitHub**, livrables barrés / phases réalistes, limites actuelles. |

---

*Pour prioriser : choisir une phase, créer des tickets (GitHub Issues ou outil interne) et lier les PR à ces tickets.*
