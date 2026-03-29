# Roadmap JobTrack

Suivi de candidatures — **monorepo** : frontend statique + API Node (Express). Ce document regroupe des **axes d’amélioration** et une **planification indicative** (priorités et jalons), pas des engagements de date.

---

## Structure monorepo (v0.1.0)

| Dossier | Rôle |
|---------|------|
| `apps/web/` | **Next.js 15** (App Router, React 19, TypeScript, Tailwind 4). UI + `app/api/*` (même serveur). |
| `apps/web/public/` | `manifest.webmanifest`, `icons/`, **`sw.js`** généré au build (PWA ; désactivé en `next dev`). |
| `apps/web/data/` | `candidatures.json` (gitignored) — persistance locale des candidatures. |
| `archive/legacy-express-api/` | Ancienne API Express (référence uniquement). |
| `archive/legacy-static-web/` | Ancienne SPA HTML/JS. |

**Démarrage** : racine — `npm install`, puis `npm run dev` → [http://localhost:3000](http://localhost:3000). **Prod / PWA** : `npm run build` puis `npm run start` — le service worker est actif hors mode développement.

---

## État actuel (référence)

- **Forces** : interface cohérente (thème, responsive), pipeline et KPIs, import CSV avec gestion des doublons, modèle CSV exportable, **persistance fichier via API** quand l’app est servie par Express.
- **Limites** : un seul fichier JSON (pas de conflits multi-utilisateurs), import sensible à la casse des colonnes CSV, pas de tests automatisés sur l’API, pas d’auth.

---

## Améliorations proposées (par thème)

### Données et fiabilité

| Idée | Intérêt |
|------|---------|
| **Persistance locale** (`localStorage` / offline) en complément du backend | Filet de sécurité si serveur coupé ; sync éventuelle plus tard. |
| **Sauvegarde / restauration** (export JSON + import) | Copie de secours, migration, debug utilisateur. |
| **Normalisation des en-têtes CSV** | Accepter `Company`, `COMPANY`, espaces — aligné sur `validateHeaders` / `mapRow`. |
| **Horodatage `_updatedAt`** systématique | Meilleur tri et audit des modifications. |

### Expérience utilisateur

| Idée | Intérêt |
|------|---------|
| **Rappels / relances** : surlignage ou section « à traiter aujourd’hui » (`follow_up_date`) | Colle au métier « job search » sans agenda externe obligatoire. |
| **Recherche élargie** (notes, source, email) | Moins de frustration que recherche entreprise + poste seuls. |
| **Vue Kanban** par statut (optionnelle) | Lecture rapide du pipeline pour certains profils. |
| **Accessibilité** : focus piégé dans les modales, annonces `aria-live` pour toasts import | Conformité et confort clavier / lecteur d’écran. |

### Technique et maintenance

| Idée | Intérêt |
|------|---------|
| **Découper `app.js`** en modules (ES modules ou fichiers `src/*.js` + bundler léger) | Lisibilité et évolution sans fichier unique de 1200+ lignes. |
| **Typage JSDoc ou TypeScript** sur le modèle « candidature » | Moins d’erreurs sur les champs CSV / formulaire. |
| **Tests** : smoke tests sur `norm`, `mapRow`, `isDuplicate`, `mergeCandidatures` | Sécuriser les régressions import / doublons. |
| **PWA** (manifest + service worker minimal) | Installation sur mobile, cache des assets statiques. |

### Évolution produit (optionnel, plus tard)

| Idée | Intérêt |
|------|---------|
| **Backend optionnel** (sync compte, partage) | Multi-appareil ; complexité et coûts d’hébergement. |
| **Extension navigateur** « ajouter l’offre depuis l’onglet » | Gain de temps ; maintenance des parseurs par site. |
| **Statistiques** (délais moyens par étape, taux de conversion) | Visualisation de l’efficacité de recherche. |

---

## Roadmap par phases

### Phase 1 — Stabilité et confiance *(court terme)*

1. ~~Persistance côté serveur (fichier JSON) + chargement au démarrage~~ — **en place** (`PUT` liste complète).
2. Export / import JSON (même schéma que les objets en mémoire), endpoints ou téléchargement navigateur.
3. Cartographier et corriger les cas limites CSV (en-têtes, lignes vides, encodage).
4. Retirer ou centraliser les `console.*` résiduels ; messages d’erreur utilisateur homogènes.

**Indicateur de succès** : recharger la page ne fait plus perdre les données ; un export JSON est rejouable sans corruption.

### Phase 2 — Usage quotidien *(moyen terme)*

1. Tableau ou encart « relances du jour / cette semaine » basé sur `follow_up_date`.
2. Recherche sur notes + champs secondaires.
3. Amélioration accessibilité modales et formulaires.
4. Documentation utilisateur courte (`README` ou aide in-app) : import CSV, doublons, sauvegarde.

**Indicateur de succès** : un parcours « import → filtrer → relance → export sauvegarde » est documenté et utilisable au clavier.

### Phase 3 — Qualité et extensibilité *(moyen / long terme)*

1. Refactor modulaire de `js/app.js` (+ convention de nommage des événements / vues).
2. Suite de tests unitaires minimale (Node ou navigateur).
3. PWA légère si l’usage mobile est confirmé.
4. Évaluation TypeScript ou JSDoc strict selon l’appétit pour l’outillage.

**Indicateur de succès** : modification d’une règle métier (ex. doublon) avec test de non-régression.

### Phase 4 — Vision *(long terme, discrétionnaire)*

- Sync cloud / compte utilisateur.
- Kanban ou vues analytiques avancées.
- Intégrations (calendrier, ATS externes).

---

## Principes directeurs

- **Backend intégré** dans le monorepo (Express) ; évolution possible vers SQLite/Postgres sans changer le contrat API minimal.
- **Petites livraisons** : chaque phase doit livrer quelque chose d’utilisable sans tout refactor d’un coup.
- **Compatibilité des données** : toute évolution de schéma prévoit une migration ou un numéro de version dans le JSON stocké.

---

## Historique du document

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-03-29 | Première roadmap après restructuration `js/`, `assets/css/`, correctifs modale doublons. |
| 1.1 | 2026-03-29 | Monorepo `apps/web` + `apps/api`, persistance `candidatures.json`, `roadmap` mise à jour. |

---

*Pour ajuster les priorités, choisir une phase cible et découper les tickets correspondants dans votre outil de suivi habituel.*
