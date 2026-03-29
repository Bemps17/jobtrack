# Prompt pour agent navigateur Comet — Migration Supabase `user_id` + Clerk (JobTrack)

Copie-colle le bloc **« PROMPT À ENVOYER »** dans Comet. Le script SQL de référence dans le dépôt : **`prompts/supabase-user-id-clerk-rls.sql`**.

---

## PROMPT À ENVOYER

```
Tu es un agent navigateur. Ta mission : finaliser la **mise en corrélation des candidatures JobTrack avec l’utilisateur Clerk** dans **Supabase**, et optionnellement activer le **mode RLS + JWT Clerk** côté application.

### Règles de sécurité
- **Ne jamais** coller dans le chat les clés `service_role`, `anon`, secrets Clerk, ni le contenu de `.env.local`.
- L’utilisateur peut te donner **son `user_id` Clerk** au format `user_…` pour l’UPDATE SQL — c’est un identifiant métier, pas un mot de passe ; si tu doutes, demande-lui de l’afficher lui-même dans le dashboard Clerk (Users → détail utilisateur) et de te dire seulement s’il a bien copié la valeur dans le SQL **lui-même** plutôt que de la dicter.
- Avant toute modification destructrice sur une base déjà en prod, rappelle à l’utilisateur de faire une **sauvegarde** ou export si possible.

### Contexte produit
- App **JobTrack** (Next.js) : l’API `/api/candidatures` associe chaque ligne à l’**utilisateur connecté via Clerk** grâce à la colonne **`user_id`** (texte = id Clerk `user_…`).
- **Sans la colonne `user_id`** en base, les requêtes Supabase depuis l’app **échouent** : la migration SQL est **obligatoire** avant de déployer ce comportement en production sur une base existante.
- Les lignes déjà présentes avec **`user_id` NULL** ne sont **pas visibles** pour l’utilisateur une fois le filtre actif : il faut un **`UPDATE`** de rattachement (au moins pour les données historiques de l’utilisateur principal).

### Partie A — Obligatoire (SQL Supabase)

1. Ouvre le **dashboard Supabase** du projet JobTrack (l’utilisateur se connecte si nécessaire).
2. Va dans **SQL Editor** → **New query**.
3. Exécute **d’abord** uniquement le bloc minimal suivant (équivalent au début du fichier `prompts/supabase-user-id-clerk-rls.sql` du repo) :

```sql
ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_candidatures_user_id ON public.candidatures (user_id);
```

4. Vérifie dans **Table Editor** que la colonne **`user_id`** existe sur `public.candidatures`.
5. Demande à l’utilisateur son **identifiant Clerk** (`user_…`) s’il veut rattacher l’existant, puis prépare un **UPDATE** du type (l’utilisateur remplace la valeur ou l’exécute lui-même) :

```sql
UPDATE public.candidatures
SET user_id = 'user_REMPLACER_PAR_L_ID_CLERK'
WHERE user_id IS NULL;
```

6. Vérifie avec un **SELECT** (count ou échantillon) qu’il ne reste **plus de lignes NULL** pour les données que l’utilisateur veut garder. S’il y a **plusieurs utilisateurs** réels sur la même table sans distinction historique, **ne devine pas** : explique qu’il faudra soit plusieurs UPDATE ciblés (par critère métier), soit accepter de tout attribuer à un seul compte pour l’instant.

7. (Optionnel, plus tard) Si l’utilisateur veut une contrainte stricte : quand toutes les lignes ont un `user_id`, **`ALTER COLUMN user_id SET NOT NULL`** — seulement après validation explicite.

### Partie B — Optionnelle (RLS + JWT Clerk, sans service role pour l’API)

À faire **seulement si** l’utilisateur confirme vouloir ce mode.

1. **Clerk** : Dashboard → activer l’**intégration Supabase** (flux documenté par Clerk) et noter le **domaine / instructions** fournis.
2. **Supabase** : **Authentication** → **Sign In / Up** → **Third-party** (ou équivalent) → ajouter le provider **Clerk** avec les paramètres demandés (domaine Clerk, etc.).
3. Dans **SQL Editor**, exécuter le **reste** du fichier `prompts/supabase-user-id-clerk-rls.sql` : `ENABLE ROW LEVEL SECURITY` + les **quatre policies** (`candidatures_select_own`, `insert`, `update`, `delete`) sur `authenticated` avec `(auth.jwt()->>'sub') = user_id`.
4. Si des policies du même nom existent déjà, utilise `DROP POLICY IF EXISTS …` avant de recréer (comme indiqué en commentaire dans le script).
5. Rappelle à l’utilisateur côté **Next.js** (`apps/web/.env.local`) :
   - définir **`SUPABASE_USE_CLERK_JWT=true`** ;
   - garder **`NEXT_PUBLIC_SUPABASE_URL`** et **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ;
   - **retirer ou ne plus utiliser** **`SUPABASE_SERVICE_ROLE_KEY`** pour ce mode (l’app bascule sur le client anon + JWT ; la service role n’est plus nécessaire pour `/api/candidatures` dans cette configuration).
6. Redémarrer le serveur de dev après modification des variables.

### Partie C — Si l’utilisateur reste en mode « service role » (défaut)

- Il **ne doit pas** exécuter la partie RLS du script (ou seulement ajouter colonne + index + UPDATE), sinon la clé **anon** sans JWT pourrait être bloquée selon les policies.
- Il garde **`SUPABASE_SERVICE_ROLE_KEY`** : l’app filtre quand même par **`user_id`** côté code ; la colonne et le **backfill UPDATE** restent **obligatoires**.

### Livrable attendu en fin de mission

Réponds en puces claires :
- Colonne **`user_id`** créée : oui/non.
- **`UPDATE` NULL → user Clerk** exécuté : oui/non (et nombre de lignes affectées si l’UI le montre).
- Intégration **Clerk ↔ Supabase** + **RLS** : faite / non faite / N/A.
- Rappel des **variables d’environnement** à ajuster (noms seulement, pas les valeurs).
- **Avertissement** si des lignes sont encore `user_id IS NULL` (risque de disparition dans l’app).
```

---

## Références dans le dépôt

| Fichier | Rôle |
|---------|------|
| `prompts/supabase-user-id-clerk-rls.sql` | Script SQL complet (colonne, index, policies RLS). |
| `prompts/comet-clerk.md` | Configuration initiale Clerk + lien avec Supabase. |
| `apps/web/.env.example` | Variables `SUPABASE_USE_CLERK_JWT`, anon, service role. |
