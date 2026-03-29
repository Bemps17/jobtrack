import { CSV_COLUMNS, ENUM_VALUES } from "./constants";

const COLS_HEADER = CSV_COLUMNS.join(",");

const CONTRACT_OPTS = ENUM_VALUES.contract_type
  .filter((x) => x !== "")
  .join(" | ");
const WORK_OPTS = ENUM_VALUES.work_mode.filter((x) => x !== "").join(" | ");
const STATUS_OPTS = ENUM_VALUES.status.filter((x) => x !== "").join(" | ");
const PRIO_OPTS = ENUM_VALUES.priority.filter((x) => x !== "").join(" | ");

/**
 * Prompt court — une seule offre. Insiste sur : pas de blabla, job_url entre guillemets
 * (les URL Apec/LinkedIn ont souvent des & et ? — sans guillemets le CSV casse les colonnes).
 */
export const DEFAULT_GROQ_SYSTEM_PROMPT = `Tu es un extracteur CSV pour JobTrack. Règle absolue : ta réponse = UNE ligne de données, rien d'autre (pas de titre, pas de \`\`\`, pas de phrases).

Colonnes dans cet ordre (16 champs, séparateur virgule) :
${COLS_HEADER}

Contraintes :
- Toujours exactement 16 champs. Champ vide = ,, entre deux virgules.
- **job_url** : si non vide, entoure l'URL de guillemets doubles "https://..." (les URL contiennent & et ?).
- **company**, **job_title**, **notes** : entre guillemets dès qu'il y a une virgule, un guillemet ou un saut de ligne dans le texte ; guillemet interne → "" .
- contract_type : ${CONTRACT_OPTS} ou vide (CDI→cdi, CDD→cdd, intérim/saisonnier/incertain → autre).
- work_mode : ${WORK_OPTS} ou vide.
- status : ${STATUS_OPTS} ; si pas encore postulé → à envoyer
- priority : ${PRIO_OPTS} ; jamais « moyen », utiliser moyenne.
- date_found / date_applied / follow_up_date : AAAA-MM-JJ ou vide.

Exemple (une ligne, sans en-tête) :
Pennylane,"Développeur React, confirmé",cdi,Paris,remote,LinkedIn,"https://example.com/o?x=1&y=2",2026-03-29,,à envoyer,moyenne,45k–52k,,,,"Stack React ; télétravail partiel"`;

/**
 * Liste / page entière — prompt éprouvé (simplicité + règles strictes), aligné export JobTrack.
 */
export const GROQ_SYSTEM_PROMPT_BATCH = `Tu analyses une page d'offres d'emploi et extrais TOUTES les annonces en CSV compatible JobTrack.

SORTIES OBLIGATOIRES :
- Format : UNIQUEMENT les lignes CSV (pas de markdown, pas d'explication, pas de blocs \`\`\`)
- Réponds directement avec les données séparées par des virgules
- Une ligne CSV par offre d'emploi

STRUCTURE CSV (16 colonnes, dans cet ordre) :
${COLS_HEADER}

RÈGLES DE NORMALISATION (STRICTES) :
- contract_type : UNIQUEMENT « cdi » | « cdd » | « freelance » | « alternance » | « stage » | « autre » | vide
- work_mode : UNIQUEMENT « remote » | « hybride » | « présentiel » | vide
- status : TOUJOURS « à envoyer » (défaut si pas encore postulé)
- date_found : format AAAA-MM-JJ (ou date du jour si inconnu)
- date_applied, follow_up_date, priority : vides si inconnus (sauf si le texte les indique)
- source : nom court du site (ex. « Apec », « LinkedIn », « Indeed »)
- salary : texte court (ex. « 45k brut », « 30-40k », « À négocier »)
- notes : synthèse utile ; si virgules dans le champ, entoure le champ de guillemets (RFC 4180)

GUILLEMETS (RFC 4180) :
- Mets des guillemets autour d'un champ si :
  * Le champ contient une virgule (,)
  * Le champ contient des guillemets doubles (" → "" pour échapper)
  * Le champ contient un saut de ligne
- Sinon : pas de guillemets sauf pour company et job_title s'il y a doute
- Si une URL contient des virgules ou pose problème au découpage, entoure-la entièrement de guillemets doubles

EXTRACTION MULTI-PAGE :
- Si plusieurs pages dans le texte : traite TOUTES les annonces présentes
- Évite les doublons évidents (même URL ou même couple entreprise + intitulé)

SORTIE FINALE :
- PAS d'en-têtes (seulement les lignes de données)
- Une ligne par offre
- Virgules comme séparateurs
- Guillemets uniquement si nécessaire (RFC 4180)

Exemple de sortie attendue :
"AVATAR MOBILITE","Business Developer BtoB F/H",cdi,"Périgny - 17",,Apec,https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178262287W,2026-03-24,,à envoyer,,40k brut,,,
"BRUNET","Chargé d'Affaires en Électricité/PV F/H",cdi,"Périgny - 17",,Apec,https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178407098W,2026-03-25,,à envoyer,,À négocier,,,`;

export const GROQ_JSON_SYSTEM_ADDON = `Tu réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour).
Format exact : {"rows":[{...}]}
Chaque objet dans "rows" a exactement ces clés en chaînes ("" si inconnu), dans cet ordre logique :
${COLS_HEADER.replace(/,/g, ", ")}
Si une seule offre, "rows" contient un seul élément. Si plusieurs offres, un objet par offre.`;

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

/** Modèles texte courants (Chat Completions) — id Groq ; saisie libre possible dans l’UI. */
export const GROQ_MODEL_SUGGESTIONS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "qwen/qwen3-32b",
  "groq/compound",
  "groq/compound-mini",
] as const;

export const GROQ_DEFAULT_MAX_TOKENS_SINGLE = 2048;
export const GROQ_DEFAULT_MAX_TOKENS_BATCH = 8192;
