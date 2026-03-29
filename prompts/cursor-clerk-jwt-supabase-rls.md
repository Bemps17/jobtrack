# JobTrack — Clerk JWT + Supabase RLS (référence Cursor)

À utiliser dans le chat Cursor : `@prompts/cursor-clerk-jwt-supabase-rls.md` ou copier les sections utiles.  
**Ne pas versionner de clés secrètes** : dans `.env.local` uniquement, jamais dans ce fichier.

---

## État constaté (Supabase — 2026-03-29)

- **Projet :** `jobtrack` (région `eu-west-1`), ref public `euslaqsqiytwjsgsgamm`.
- **Table :** `public.candidatures` (~41 lignes au moment du rapport).
- **Colonne :** `user_id TEXT`, index `idx_candidatures_user_id`, backfill effectué (exemple d’ID Clerk utilisé pour les données existantes : `user_3BcTTQe0tSB9ZGPf7XxpYz7IfQI`).
- **RLS :** activée ; 4 policies (SELECT / INSERT / UPDATE / DELETE) pour le rôle `authenticated`, condition `(auth.jwt()->>'sub') = user_id::text`.

---

## Cartographie du code réel (monorepo JobTrack)

Ce dépôt **implémente déjà** la plupart des phases ci-dessous ; ne pas recréer des chemins inventés (`libs/`, `app/` sans `src/`).

| Rôle | Fichier réel |
|------|----------------|
| Middleware Clerk (Next 15) | `apps/web/src/middleware.ts` |
| `ClerkProvider` | `apps/web/src/app/layout.tsx` |
| API candidatures | `apps/web/src/app/api/candidatures/route.ts` |
| Client admin Supabase (service role) | `apps/web/src/server/supabase-admin.ts` |
| Client Supabase + JWT Clerk | `apps/web/src/server/supabase-clerk.ts` |
| Choix admin vs JWT | `apps/web/src/server/supabase-candidatures-client.ts` |
| Lecture / écriture `candidatures` | `apps/web/src/server/candidatures-supabase.ts` |
| Store + fichier JSON | `apps/web/src/server/candidatures-store.ts` |
| UI (pas de client Supabase direct requis) | `apps/web/src/context/candidatures-context.tsx` (fetch `/api/candidatures`) |
| SQL RLS + `user_id` | `prompts/supabase-user-id-clerk-rls.sql` |
| Migration guidée (Comet) | `prompts/comet-supabase-clerk-migration.md` |

Avec **`SUPABASE_USE_CLERK_JWT=true`** : le client utilise la **clé anon** + JWT ; les policies RLS filtrent. Le code **n’ajoute pas** `.eq('user_id')` dans ce mode (redondant avec RLS). En mode **service role**, le filtre `user_id` est appliqué **dans le code** (RLS contournée).

---

## Phase 1 — Variables `apps/web/.env.local`

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://euslaqsqiytwjsgsgamm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key depuis Supabase Dashboard → API Keys>

# Activer le client anon + JWT (RLS)
SUPABASE_USE_CLERK_JWT=true

# Optionnel : template JWT nommé « supabase » dans Clerk (sinon JWT de session)
# CLERK_SUPABASE_JWT_TEMPLATE=supabase

# En mode JWT RLS, ne pas compter sur la service role pour l’API candidatures :
# SUPABASE_SERVICE_ROLE_KEY=  (commenté ou absent pour ce flux)
```

Clés à copier depuis **Supabase → Project Settings → API** (URL + clé publishable/anon). Ne pas exposer la **service_role** au client.

---

## Phase 2 — Clerk : JWT template `supabase` (optionnel)

Si tu définis **`CLERK_SUPABASE_JWT_TEMPLATE=supabase`**, crée dans **Clerk Dashboard → JWT Templates** un template **`supabase`** avec au minimum un claim **`sub`** aligné sur l’id utilisateur Clerk (souvent `{{user.id}}` selon l’éditeur Clerk).

L’**intégration native Clerk ↔ Supabase** (recommandée en 2025+) peut suffire **sans** template dédié : dans ce cas, laisse **`CLERK_SUPABASE_JWT_TEMPLATE`** vide et le code utilisera **`getToken()`** seul.

---

## Phase 3 — Client Supabase + JWT (déjà implémenté)

La logique équivalente à « Option B server-side » est dans **`createSupabaseClerkServerClient()`** (`supabase-clerk.ts`), via l’option **`accessToken`** de `@supabase/supabase-js`.

Pas besoin d’un fichier séparé `libs/supabase-client.ts` sauf refactor explicite.

---

## Phase 4 — API `/api/candidatures` (déjà implémentée)

`GET` / `PUT` existent ; elles exigent une **session Clerk** et passent par **`readCandidatures(userId)`** / **`writeCandidatures(list, userId)`**.  
Chaque ligne persistée inclut **`user_id`** côté serveur (le client ne peut pas usurper un autre utilisateur).

---

## Phase 5 — Composants React

L’app charge les données via **`fetch('/api/candidatures')`** dans le contexte ; un composant client qui instancierait directement Supabase **n’est pas requis** pour le flux actuel. À n’ajouter que si tu veux du **realtime** ou des requêtes hors API Next.

---

## Sécurité (rappel)

- RLS côté base + JWT Clerk : défense en profondeur lorsque **`SUPABASE_USE_CLERK_JWT=true`**.
- Ne jamais exposer **`SUPABASE_SERVICE_ROLE_KEY`** au navigateur.
- Ne pas committer **`.env.local`**.

---

## Tests rapides

1. `.env.local` avec **`SUPABASE_USE_CLERK_JWT=true`**, serveur redémarré.
2. Connexion Clerk → **`GET /api/candidatures`** doit retourner **200** et les lignes de l’utilisateur.
3. Si **401** ou erreur Supabase JWT : vérifier intégration Clerk dans Supabase Auth et cohérence **`sub`** / **`user_id`**.
4. Si template utilisé : vérifier **`CLERK_SUPABASE_JWT_TEMPLATE=supabase`** et le template dans Clerk.

---

## Priorités pour Cursor / prochaines itérations

1. Valider **`.env.local`** + **`SUPABASE_USE_CLERK_JWT`** + redémarrage `npm run dev`.
2. Choisir **session JWT seule** vs **`CLERK_SUPABASE_JWT_TEMPLATE=supabase`** selon la config des dashboards.
3. Optionnel : tests e2e, realtime Supabase, ou refactor client partagé si duplication future.

---

## Utilisation dans Cursor

- **Option A :** dans le chat : `@prompts/cursor-clerk-jwt-supabase-rls.md` puis la demande (ex. « corrige l’erreur 401 sur /api/candidatures »).
- **Option B :** copier une section dans **User Rules** ou **AGENTS.md** si tu centralises les consignes projet.

**Dernière mise à jour du document :** 2026-03-29
