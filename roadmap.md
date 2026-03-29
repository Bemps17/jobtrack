# Roadmap JobTrack

Suivi de candidatures — **monorepo** basé sur **Next.js 15** (UI + API intégrées). Ce document décrit l’**état du produit (v0.2.0)**, des **axes d’amélioration** et une **planification indicative** (sans engagement de date).

---

## Dépôt et version

| Élément | Détail |
|---------|--------|
| **Version produit** | **0.2.0** (`apps/web/package.json`, `src/lib/version.ts`, racine `package.json`) |
| **Dépôt** | [github.com/Bemps17/jobtrack](https://github.com/Bemps17/jobtrack) |
| **Description** | Application pour suivre les candidatures, offres et avancement dans le recrutement |

---

## Structure monorepo (v0.2.0)

| Dossier | Rôle |
|---------|------|
| `apps/web/` | **Next.js 15** (App Router, React 19, TypeScript, Tailwind 4). UI + **Route Handlers** `app/api/*`. |
| `apps/web/src/middleware.ts` | **Clerk** : routes protégées sauf `/sign-in`, `/sign-up`, `/api/health`. |
| `apps/web/public/` | `manifest.webmanifest`, `icons/` ; **`sw.js`** généré au build (**PWA** ; désactivé en `next dev`). |
| `apps/web/data/` | `candidatures.json` (gitignored) — persistance locale si Supabase n’est pas configuré pour l’environnement. |
| `apps/web/.env.example` | Clerk, Supabase (URL, anon, service role), `SUPABASE_USE_CLERK_JWT`, `CLERK_SUPABASE_JWT_TEMPLATE` (optionnel), **`GROQ_API_KEY`** (extraction IA). |
| `apps/web/src/app/(app)/donnees/` | Page **Import / export** : CSV & JSON, collage, JSON Lines, extraction **Groq** (`/api/groq/extract`). |
| `apps/web/src/app/api/groq/extract/` | **POST** — Chat Completions Groq ; clé serveur uniquement. |
| `prompts/` | Prompts agents (**Comet** : Supabase, Clerk, migration RLS) + référence Cursor **Clerk JWT / RLS**. |
| `archive/legacy-express-api/` | Ancienne API Express (référence). |
| `archive/legacy-static-web/` | Ancienne SPA HTML/JS. |
| `.cursor/rules/` | Règles Cursor projet (version **0.2.0**, conventions). |

**Démarrage** : à la racine — `npm install`, `npm run dev` → [http://localhost:3000](http://localhost:3000) (autre port si 3000 occupé). **Production / PWA** : `npm run build` puis `npm run start` — service worker actif hors développement.

---

## Livré en v0.1.0 (récapitulatif)

- Application **React** (pages `/`, `/list`, `/relances`), layout responsive, thème clair/sombre.
- **KPIs**, pipeline, liste récente, filtres / tri, vue **Relances**, CRUD + modales (détail, formulaire, import CSV, doublons).
- **API** : `GET` / `PUT` `/api/candidatures`, `GET` `/api/health` (inclut la version).
- **Persistance** fichier JSON par défaut ; **Supabase** optionnelle (sync liste complète).
- **PWA** : manifest + workbox.
- Structure **`src/lib/*`**, **`src/context/*`**, **`src/components/*`**.

## Livré en v0.2.0 *(2026-03-29)*

- **Authentification Clerk** : `ClerkProvider`, `/sign-in` / `/sign-up`, middleware, `UserButton` / connexion dans la shell ; **`/api/candidatures`** réservée aux utilisateurs connectés.
- **Supabase** : colonne **`user_id`** (id Clerk) ; écriture/lecture **scoping** par utilisateur avec **service role** ; mode optionnel **`SUPABASE_USE_CLERK_JWT=true`** (clé **anon** + JWT Clerk, **RLS** en base). Variable **`CLERK_SUPABASE_JWT_TEMPLATE`** pour un template JWT nommé si besoin.
- **Qualité** : messages d’erreur API enrichis en dev ; dates normalisées pour Postgres ; script **`npm run test:supabase`** ; page **`not-found`** ; correctif clés React dupliquées (**liste** : pastilles contrat / lieu / mode).
- **Documentation** : prompts **Comet** (Clerk, migration RLS), **`prompts/cursor-clerk-jwt-supabase-rls.md`**, SQL **`prompts/supabase-user-id-clerk-rls.sql`**, `.npmrc` **legacy-peer-deps** pour Clerk + React 19.

### Complément v0.2.0 *(import / export & Groq, 2026-03-29)*

- **Page `/donnees`** (« Import / export ») dans la barre latérale ; le dashboard pointe vers cette page.
- **Export** : **CSV** (UTF-8 avec BOM) et **JSON** ; téléchargement du **modèle CSV** (inchangé côté métier).
- **Import CSV** : fichier ou **collage** (avec en-tête) ; lignes `#` ignorées comme avant.
- **Import JSON** : **tableau** d’objets ou **JSON Lines** (une ligne = une candidature).
- **Groq** : route **`POST /api/groq/extract`** ([Chat Completions](https://console.groq.com/docs/api-reference#chat-create)) — prompt **système personnalisable** (défaut dans `groq-prompt-defaults.ts`), modèle / température / max tokens, persistance **localStorage** ; extraction d’**une ligne CSV** alignée sur les colonnes JobTrack, puis fusion avec la détection de **doublons** existante.
- **Variables** : `GROQ_API_KEY` dans **`.env.local`** (documenté dans `.env.example`) — jamais exposée au client.

---

## État actuel (limites connues)

- **Données** : JSON local **sans** isolation multi-utilisateur ; Supabase **avec** `user_id` + filtre ou RLS selon le mode — pas de résolution de conflits si deux sessions écrivent en parallèle.
- **CSV** : en-têtes sensibles à la casse / nom exact des colonnes (`company`, `job_title`, …).
- **Groq** : sans **`GROQ_API_KEY`** côté serveur, l’extraction IA renvoie une erreur explicite (le reste import/export fonctionne).
- **Qualité** : pas de suite de tests automatisés ; peu de couverture accessibilité ; **build prod** peut encore échouer sur le prerender de certaines pages (webpack) — à traiter.
- **Sécurité** : exposition publique nécessite **Clerk** + secrets **Vercel** corrects ; ne jamais publier **service role** ou **CLERK_SECRET_KEY** côté client.

---

## Améliorations proposées (par thème)

### Données et fiabilité

| Idée | Intérêt |
|------|---------|
| ~~**Export / import JSON**~~ | **Livré** (page `/donnees`) — sauvegarde / restauration ; **JSONL** en plus. |
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
| **Postgres (Supabase)** | Branché : **sync** `GET`/`PUT`, **`user_id` Clerk**, filtre service role ou **RLS + JWT** (`SUPABASE_USE_CLERK_JWT`). |
| **Déploiement** documenté (Vercel, Docker, VPS) | Reproductibilité hors machine locale. |

### Évolution produit (optionnel, plus tard)

| Idée | Intérêt |
|------|---------|
| Compte / **sync cloud** | **Partiel** : Clerk + Supabase par utilisateur ; affiner sauvegarde / conflits multi-appareil. |
| **Extension navigateur** « ajouter l’offre depuis l’onglet » | Gain de temps. |
| **Statistiques** (délais par étape, conversion) | Pilotage de la recherche. |

---

## Backlog UX / UI & QoL *(recommandations fusionnées)*

> Synthèse d’un document produit externe intégré ici. **Vocabulaire aligné sur l’app** : statut **`envoyée`** (pas « c’est envoyé »), champ **`date_applied`** pour la date de candidature (équivalent « date postulée »).

### Cartographie : doublons avec la roadmap / le produit

| Sujet (doc UX) | Déjà prévu ou livré | Précision |
|----------------|---------------------|-----------|
| Recherche / filtres (barre, Ctrl+K, favoris) | Oui (partiel) | Filtres / tri **liste** existants ; **Recherche élargie** (notes, source, email) — tableau « Expérience utilisateur » + Phase 2. Le reste (Ctrl+K, filtres sauvegardés) est **nouveau**. |
| Vue Kanban / pipeline | Oui | Ligne **Vue Kanban** + Phase 4 ; le **drag & drop** entre colonnes est un **plus** non détaillé avant. |
| Thème clair / sombre | **Livré** v0.1.0 | Toggle présent ; **persistance** préférence + **thème système** = complément (doc §3.1). |
| PWA / mobile installable | **Livré** (build prod) | Affiner **responsive** et parcours tactile = enrichissement doc §4.5. |
| Relances / rappels (7j, 14j, badges) | Oui (proche) | **Relances calendaires** + `follow_up_date` — Phase 2 ; badges « en attente X jours » = **extension**. |
| Export données (CSV, Excel, PDF) | Partiel | **CSV + JSON** livrés (`/donnees`) ; **Excel / PDF** = à ajouter. |
| Stats, graphiques, KPI avancés | Oui (partiel) | **KPIs** dashboard existants ; **analytics** (conversion, délais, sources) — évolution produit + Phase 4. |
| Intégrations (LinkedIn, Gmail, Cal, Zapier) | Oui (vision) | Phase 4 **vision** ; pas de doublon de contenu, même horizon. |
| Accessibilité & clavier | Oui (partiel) | **Accessibilité** modales — tableau UX ; **raccourcis globaux** (N, E, /, ↑↓) = **nouveau** (doc §2.2). |
| Toasts / feedback sauvegarde | Partiel | **Toasts** déjà en place ; **loading states** boutons, confirmations plus visibles = quick wins doc. |
| Notes longues | Livré | Champ **`notes`** ; **pièces jointes / historique e-mails** (doc §4.1) = **nouveau scope**. |
| Collaboration / partage | Oui (loin) | Même famille que **sync / comptes** — Phase 4 ; doc §4.6 détaille plus. |

### Fonctionnalités nettement nouvelles (peu présentes avant ce document)

1. **Auto-remplissage de `date_applied`** quand le statut passe **`à envoyer`** → **`envoyée`** (date du jour ou horodatage selon choix produit) + toast explicite + rappel dans la modale. *Implémentation possible : logique dans `updateCandidature` avant `persistList`, ou trigger Postgres sur `UPDATE OF status` — aujourd’hui le `PUT` envoie la liste complète, la règle peut rester **côté client** ou **normalisation serveur**.*
2. **Drag & drop** des cartes entre colonnes de statut (pipeline) + animation / confirmation courte.
3. **Actions de masse** : cases à cocher, changement de statut / export / suppression groupés.
4. **Recherche globale Ctrl+K** et **filtres favoris** (métadonnées utilisateur).
5. **Fiches** : bordure par priorité, tags personnalisés, preview au survol, icônes d’état (relance, entretien, offre).
6. **Formulaire** : validation URL/email en direct, brouillon auto, **dupliquer** candidature, suggestions champs récurrents.
7. **Templates** e-mails / lettres de relance (§4.2).
8. **Vue calendrier / timeline** des candidatures (en plus liste / Kanban).

### Quick wins (recouvrement partiel avec phases 1–2)

- Auto-`date_applied` lors du passage en **envoyée**  
- Affiner **toasts** et **loading states** sur sauvegarde  
- Bouton **Dupliquer** une candidature  
- **Tri au clic** sur en-têtes de tableau (liste)  
- **Sélection multiple** + compteur + actions groupées  
- **Autocomplete** (entreprises, villes, sources déjà vues)  
- **Couleur / bordure** selon priorité  
- Affichage **relatif** (« il y a 3 jours ») depuis `date_applied` ou `_createdAt`  
- **Retour en haut** sur longues listes  

### Priorisation type sprints (indicative)

| Niveau | Exemples d’items | Lien roadmap |
|--------|------------------|--------------|
| **Haute** | Auto `date_applied` ; recherche / filtres enrichis ; toasts + loading ; dupliquer | Croiser **Phase 1–2** |
| **Moyenne** | Raccourcis clavier ; DnD pipeline ; tags ; ~~export CSV~~ **fait** ; thème persisté + système | **Phase 2–3** |
| **Basse** | Intégrations tierces ; analytics poussés ; collaboration ; templates e-mail | **Phase 4** |

---

## Roadmap par phases

### Phase 1 — Stabilité et confiance *(court terme)*

1. ~~Persistance serveur + chargement au démarrage~~ — **fait** (Next + `candidatures.json` / option Supabase).
2. ~~**Export / import JSON**~~ — **fait** (page `/donnees`, schéma `Candidature` ; JSONL supporté).
3. **Robustesse CSV** : en-têtes normalisés, messages d’erreur homogènes, encodage.
4. **CI** GitHub Actions : au minimum `npm run build` sur `main`.
5. *(UX — backlog ci-dessus)* **Quick wins** : loading states sauvegarde, **dupliquer** candidature ; ~~export **CSV** simple~~ — **fait** sur `/donnees`.

**Indicateur de succès** : sauvegarde JSON rejouable ; build vert sur le dépôt distant.

### Phase 2 — Usage quotidien *(moyen terme)*

1. Encart ou filtre **relances par date** (`follow_up_date`) ; rappels / badges « en attente depuis X jours » *(voir backlog UX § relances)*.
2. **Recherche étendue** aux notes et métadonnées ; option **Ctrl+K** / filtres favoris si pertinent.
3. **Auto-`date_applied`** lors du passage **à envoyer → envoyée** + message utilisateur *(backlog UX priorité haute)*.
4. **Accessibilité** modales et navigation clavier ; **raccourcis** (N, E, /, …) en complément progressif.
5. Aide in-app courte ou section README avancée (import, doublons, déploiement).

**Indicateur de succès** : parcours import → filtre → relance → export documenté et utilisable au clavier.

### Phase 3 — Qualité et extensibilité *(moyen / long terme)*

1. ~~Refactor modulaire + TypeScript~~ — **amorcé** (base actuelle) ; poursuivre découpage et réduction du « god context » si besoin.
2. ~~**PWA**~~ — **fait** (build prod) ; affiner icônes PNG multi-tailles si nécessaire stores / install.
3. Couverture **tests** ciblés + **lint** strict sur les PR.
4. ~~**Base SQL** multi-utilisateur~~ — **amorcé** (Supabase + `user_id` + Clerk) ; stabiliser **build prod** et monitoring.

**Indicateur de succès** : changement de règle métier (ex. doublon) couvert par au moins un test.

### Phase 4 — Vision *(long terme)*

- ~~Auth~~ **Clerk livré** ; affiner **sync** et **collaboration** ; **Kanban** avec **drag & drop**, vues **calendrier / timeline**, intégrations (calendrier, ATS, LinkedIn / e-mail), **analytics** poussés *(backlog UX §4)*.

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
| **1.3** | **2026-03-29** | **Backlog UX/UI & QoL** intégré : tableau **doublons vs roadmap**, nouveautés, quick wins, priorisation sprints ; phases 1–2–4 ajustées. |
| **1.4** | **2026-03-29** | **v0.2.0** : Clerk, Supabase `user_id` + modes service role / JWT RLS, prompts Comet & Cursor, correctifs UI ; roadmap et limites mises à jour. |
| **1.5** | **2026-03-29** | Page **`/donnees`** (import/export CSV, JSON, JSONL), API **Groq** (`GROQ_API_KEY`), prompts IA personnalisables ; Phase 1 et backlog export mis à jour. |

---

*Pour prioriser : choisir une phase, créer des tickets (GitHub Issues ou outil interne) et lier les PR à ces tickets.*
