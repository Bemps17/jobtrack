# JobTrack

Application pour suivre mes candidatures, offres d’emploi et mon avancement dans le processus de recrutement.

**Version** : 0.2.0

## Stack

- **Next.js 15** (App Router), React 19, TypeScript, Tailwind CSS 4
- **PWA** (manifest + service worker en production)
- **Clerk** (authentification) ; persistance **Supabase** (optionnel, `user_id`) ou fichier `apps/web/data/candidatures.json` (via API Route Handlers)

## Prérequis

- Node.js **18+**

## Installation et exécution

À la racine du monorepo :

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) (ou le port indiqué dans le terminal si 3000 est occupé).

```bash
npm run build   # build production + assets PWA
npm run start   # serveur de production
```

## Structure

| Chemin | Description |
|--------|-------------|
| `apps/web/` | Application Next.js (`@jobtrack/web`) |
| `archive/legacy-static-web/` | Ancienne interface HTML/JS (référence) |
| `archive/legacy-express-api/` | Ancienne API Express (référence) |
| `roadmap.md` | Pistes d’évolution |

## Licence

Projet personnel — voir le dépôt pour les éventuelles précisions.
