# Prompt pour agent navigateur Comet — Base Supabase JobTrack

Copie-colle le bloc **« PROMPT À ENVOYER »** dans Comet. Adapte les parties entre crochets `[...]` si besoin.

---

## PROMPT À ENVOYER

```
Tu es un agent navigateur. Ta mission : préparer une base de données Supabase pour l’application **JobTrack** (suivi de candidatures), sans stocker mes mots de passe ni les afficher dans le chat.

### Contexte applicatif
- App : Next.js 15, modèle métier « candidature » (une ligne = une offre / candidature suivie).
- Champs métier (équivalent frontend) :
  - id : identifiant texte unique (l’app génère des ids courts type base36 ; en BDD on peut utiliser TEXT en clé primaire, ou UUID — vois section SQL).
  - company, job_title : obligatoires côté métier.
  - contract_type, work_mode, status, priority : texte (valeurs contrôlées côté app : CDI/CDD, remote/hybride, statuts français type « à envoyer », « envoyée », etc.).
  - location, source, job_url, salary, contact_name, contact_email, notes : texte.
  - date_found, date_applied, follow_up_date : dates au format logique YYYY-MM-DD (colonne DATE en PostgreSQL).
  - created_at, updated_at : horodatage (timestamptz).

### Ce que tu dois faire dans le navigateur (ordre logique)
1. Ouvre https://supabase.com et connecte-toi (je saisis moi-même email/mot de passe ou SSO si une fenêtre s’ouvre — ne me demande pas de te les dicter).
2. Va dans le **dashboard** : crée un **nouveau projet** nommé `jobtrack` (ou utilise le projet que j’indique), région EU de préférence, mot de passe DB laissé à moi si demandé.
3. Une fois le projet prêt, ouvre **SQL Editor** → **New query**.
4. Colle et **exécute** le script SQL ci-dessous **en un seul run**. Corrige seulement si l’UI signale une erreur de syntaxe, puis ré-exécute.

### Script SQL à exécuter (PostgreSQL / Supabase)

-- Table principale (snake_case, alignée Postgres)
CREATE TABLE IF NOT EXISTS public.candidatures (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  contract_type TEXT DEFAULT '',
  location TEXT DEFAULT '',
  work_mode TEXT DEFAULT '',
  source TEXT DEFAULT '',
  job_url TEXT DEFAULT '',
  date_found DATE,
  date_applied DATE,
  status TEXT DEFAULT 'à envoyer',
  priority TEXT DEFAULT 'moyenne',
  salary TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  follow_up_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index utiles pour filtres / tri
CREATE INDEX IF NOT EXISTS idx_candidatures_status ON public.candidatures (status);
CREATE INDEX IF NOT EXISTS idx_candidatures_company ON public.candidatures (company);
CREATE INDEX IF NOT EXISTS idx_candidatures_created_at ON public.candidatures (created_at DESC);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidatures_updated_at ON public.candidatures;
CREATE TRIGGER trg_candidatures_updated_at
  BEFORE UPDATE ON public.candidatures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security (à activer ; policies à ajuster selon auth)
ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;

-- Politique MVP : accès complet pour le rôle service (backend Next avec service_role)
-- L’app cliente utilisera plutôt le client Supabase avec clé anon + policies par user_id plus tard.
-- Pour l’instant, politique restrictive côté anon et lecture pour authenticated si on ajoute user_id :
-- (Option A — développement seulement, à retirer en prod) :
-- CREATE POLICY "allow_all_authenticated" ON public.candidatures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recommandation : ne pas créer de policy permissive anon. Indique-moi dans un résumé final que je dois soit :
-- - utiliser la clé **service_role** uniquement côté serveur Next (variables d’environnement, jamais exposée au client), soit
-- - ajouter une colonne user_id UUID REFERENCES auth.users(id) et des policies par utilisateur.

COMMENT ON TABLE public.candidatures IS 'Candidatures JobTrack v0.1.0';

5. Va dans **Table Editor** et vérifie que la table `candidatures` existe avec toutes les colonnes.
6. Va dans **Project Settings → API** et note pour moi (sans coller les secrets dans un canal non sécurisé si je te le demande) : **URL du projet** et les noms des variables `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` que je devrai configurer dans Next.js.

### Contraintes
- Ne partage pas mes clés API dans une capture d’écran lisible par des tiers ; résume seulement « clés créées / où les copier ».
- Si une étape échoue (quota, erreur RLS), décris l’erreur exacte et propose la correction minimale (SQL ou toggle dashboard).

### Livrable attendu
À la fin, résume en puces : projet créé oui/non, table `candidatures` ok, RLS activé, prochaine étape recommandée pour brancher Next.js (variables d’env + client serveur).
```

---

## Notes pour toi (développeur)

- **RLS activé sans policy** bloque tout accès via clé `anon`. Pour un premier branchement **100 % serveur** (Route Handlers Next + `service_role`), crée une policy réservée au service role ou utilise le client admin côté serveur uniquement.
- **Auth Clerk (retenu)** : pas `auth.users` Supabase — colonne **`user_id TEXT`** = id Clerk (`user_…`), filtre côté API avec service role ; RLS optionnelle avec JWT Clerk : voir **`prompts/supabase-user-id-clerk-rls.sql`** et **`prompts/comet-clerk.md`**.
- Migration depuis `candidatures.json` : script Node ou import CSV depuis l’app une fois l’API Supabase branchée.
