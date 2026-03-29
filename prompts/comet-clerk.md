# Prompt pour agent navigateur Comet — Clerk (auth) JobTrack

Copie-colle le bloc **« PROMPT À ENVOYER »** dans Comet. Adapte les parties entre crochets `[...]` si besoin (URL de prod, nom d’application).

---

## PROMPT À ENVOYER

```
Tu es un agent navigateur. Ta mission : **configurer un projet Clerk** pour l’application **JobTrack** (Next.js 15, App Router), afin que l’authentification fonctionne en local et en production.

### Règles de sécurité
- **Ne jamais** coller dans le chat les clés secrètes (`sk_live_…`, `sk_test_…`) ni le contenu complet du fichier `.env.local`.
- À la fin, indique seulement **où** l’utilisateur doit copier les clés (écrans Clerk) et **quels noms de variables** utiliser — c’est l’utilisateur qui les met dans son fichier local.
- Ne demande pas à l’utilisateur de te dicter son mot de passe Clerk ; il se connecte lui-même si une fenêtre s’ouvre.

### Contexte technique (déjà en place dans le code)
- Framework : **Next.js 15**, App Router, dossier `apps/web/`.
- Middleware Clerk dans **`src/middleware.ts`** (Next 15 ; la doc Clerk « Next 16+ » parle de `proxy.ts` — même rôle).
- Composants : **`ClerkProvider`** dans `app/layout.tsx`, pages **`/sign-in`** et **`/sign-up`** (catch-all Clerk), boutons **Connexion / Créer un compte** + **`UserButton`** dans la sidebar.
- Routes protégées par défaut : tout sauf **`/sign-in`**, **`/sign-up`**, **`/api/health`**.
- API **`/api/candidatures`** exige une session Clerk (401 si non connecté).
- **Supabase** : chaque candidature est liée au **`user_id` Clerk** (colonne `user_id` en base). Mode par défaut : **service role** + filtre applicatif. Mode optionnel : **`SUPABASE_USE_CLERK_JWT=true`** + RLS et JWT session (voir `prompts/supabase-user-id-clerk-rls.sql`).

### Ce que tu dois faire dans le navigateur (ordre logique)

1. Ouvre **https://dashboard.clerk.com** et connecte-toi (l’utilisateur saisit ses identifiants si nécessaire).

2. **Application Clerk**
   - Crée une **nouvelle application** nommée par ex. `JobTrack` (ou utilise celle indiquée par l’utilisateur).
   - Type / framework : choisir **Next.js** si l’assistant Clerk le propose (sinon « Autre » / générique, ce n’est pas bloquant).

3. **URLs et CORS (très important)**
   - Dans **Configure** → **Paths** (ou équivalent « URLs » / « Domains » selon l’UI Clerk actuelle) :
     - **Sign-in URL** : `/sign-in`
     - **Sign-up URL** : `/sign-up`
   - **URLs autorisées / redirect** (dev + prod) :
     - Développement : `http://localhost:3000` (et le port affiché par Next si différent, ex. `http://localhost:3001`).
     - Production : l’URL Vercel ou domaine final `[https://ton-domaine.vercel.app]` (à demander à l’utilisateur s’il ne l’a pas donnée).
   - Vérifie qu’il n’y a pas d’incohérence qui provoquerait une boucle de redirection après login.

4. **Clés API à récupérer pour l’utilisateur** (lui seul les copie dans `apps/web/.env.local`)
   - Va dans **API Keys** (ou **Developers** → **API keys**).
   - Il doit créer / copier :
     - **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** — clé **publique** (publishable), préfixe typique `pk_test_…` ou `pk_live_…`.
     - **`CLERK_SECRET_KEY`** — clé **secrète** (secret), **jamais** exposée au client, **jamais** en `NEXT_PUBLIC_*`.
   - Rappelle-lui d’ajouter aussi sur **Vercel** (ou autre hébergeur) les **mêmes** variables d’environnement pour le build et le runtime.

5. **Méthodes de connexion**
   - Dans **User & Authentication** → **Email, Phone, Username** (ou équivalent) : active au minimum **Email** (mot de passe ou magic link selon ce que l’utilisateur veut).
   - Optionnel : activer **Google** ou autre provider OAuth si l’utilisateur le demande — configure les redirect URIs indiqués par Clerk (localhost + prod).

6. **Vérification fonctionnelle (guidée, sans exposer de secrets)**
   - Dis à l’utilisateur de lancer `npm run dev` à la racine du monorepo, d’ouvrir l’app, de cliquer **Connexion** ou d’aller sur `/sign-in`, de créer un compte ou de se connecter.
   - Succès attendu : redirection vers l’app, **avatar / UserButton** visible dans la sidebar, plus d’erreur 401 sur `/api/candidatures` dans l’onglet Réseau.

7. **Corrélation Clerk ↔ Supabase (si l’utilisateur le demande)**
   - **Intégration recommandée (2025+)** : [Clerk × Supabase](https://clerk.com/docs/integrations/databases/supabase) — dans Clerk, activer l’**intégration Supabase** ; dans Supabase (**Authentication → Sign In / Up → Third-party**), ajouter le provider **Clerk** avec le domaine indiqué par Clerk. Cela enrichit le JWT de session (`role: authenticated`) pour PostgREST — **plus besoin** du vieux « JWT template supabase » manuel.
   - Côté SQL : l’utilisateur exécute (ou fait exécuter) le script **`prompts/supabase-user-id-clerk-rls.sql`** : colonne **`user_id`**, index, politiques RLS sur `auth.jwt()->>'sub'`.
   - Côté `.env` : `NEXT_PUBLIC_SUPABASE_ANON_KEY` + **`SUPABASE_USE_CLERK_JWT=true`** ; retirer la dépendance à **`SUPABASE_SERVICE_ROLE_KEY`** pour ce mode si tout passe par le JWT (l’app bascule automatiquement).
   - Sans ce mode : garder **`SUPABASE_SERVICE_ROLE_KEY`** ; l’API filtre quand même par **`user_id` Clerk** (pas de RLS côté requêtes service role).

### Récapitulatif à fournir à l’utilisateur en fin de mission
- Nom du projet Clerk utilisé.
- Liste des URLs configurées (localhost + prod).
- Checklist des variables `.env.local` / Vercel (**sans** valeurs).
- Prochaine étape : premier test de connexion sur `/sign-in`.

### En cas de problème fréquent
- **Boucle de redirection** : revérifier paths `/sign-in`, `/sign-up` et domaines autorisés.
- **401 sur l’API** : session absente — vérifier que les clés correspondent au bon environnement (test vs production) et que le domaine est autorisé.
- **Build Vercel** : variables Clerk manquantes ou `CLERK_SECRET_KEY` absente côté serveur.
```

---

## Notes pour le développeur (hors prompt Comet)

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique, embarquée côté client. |
| `CLERK_SECRET_KEY` | Secret serveur uniquement (middleware, `auth()`, etc.). |

Fichier d’exemple : `apps/web/.env.example` — ne jamais y mettre de vraies clés.

Documentation Clerk Next.js : https://clerk.com/docs/nextjs/getting-started/quickstart  
Clerk × Supabase : https://clerk.com/docs/integrations/databases/supabase
