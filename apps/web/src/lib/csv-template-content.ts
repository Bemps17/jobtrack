import { CSV_COLUMNS } from "./constants";

/**
 * Ignore les lignes de préambule commençant par # (et lignes vides avant l’en-tête).
 * Le BOM UTF-8 est retiré si présent.
 */
export function stripLeadingHashCommentLines(raw: string): string {
  let text = raw;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  let foundHeader = false;
  for (const line of lines) {
    const t = line.trim();
    if (!foundHeader) {
      if (!t || t.startsWith("#")) continue;
      foundHeader = true;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

/** Bloc d’aide + prompt copiable pour extraire une ligne CSV depuis une annonce ou un site. */
function buildCommentPreambleLines(): string[] {
  const cols = CSV_COLUMNS.join(", ");
  return [
    "JobTrack — modèle d’import CSV.",
    "Les lignes commençant par # sont ignorées à l’import (tu peux les laisser dans ton fichier).",
    "",
    "── Remplir depuis une annonce ou un site d’emploi ──",
    "1) Copie le texte de l’offre (et l’URL) depuis LinkedIn, WTTJ, Indeed, le site de l’employeur, etc.",
    "2) Colle le bloc « PROMPT IA » ci-dessous dans ChatGPT, Copilot, Cursor… puis colle l’annonce.",
    "3) Récupère la ligne CSV produite et ajoute-la sous la ligne d’en-têtes (company, job_title, …).",
    "",
    "PROMPT IA (à coller tel quel puis compléter avec l’annonce) :",
    "---",
    `Tu extrais UNE offre d’emploi vers une seule ligne CSV pour l’application JobTrack.`,
    `Colonnes, dans cet ordre, séparateur virgule, guillemets doubles si un champ contient une virgule :`,
    cols + ".",
    `Règles :`,
    `- contract_type : uniquement parmi cdi, cdd, freelance, alternance, stage, autre, ou vide.`,
    `- work_mode : uniquement remote, hybride, présentiel, ou vide.`,
    `- status : souvent "à envoyer" si la candidature n’est pas encore envoyée ; sinon une valeur du pipeline (envoyée, relance à faire, …).`,
    `- date_found : format AAAA-MM-JJ ; si inconnu, date du jour.`,
    `- date_applied et follow_up_date : vides si pas encore postulé.`,
    `- source : nom du site ou du canal (ex. LinkedIn, Welcome to the Jungle, site carrière).`,
    `- job_url : lien direct vers l’annonce si disponible.`,
    `- notes : faits utiles (compétences, stack, télétravail, délai).`,
    `Réponds UNIQUEMENT avec la ligne de valeurs CSV (sans répéter la ligne d’en-tête), sans code markdown.`,
    "---",
    "",
    "Exemple de ligne de données sous l’en-tête :",
  ];
}

/**
 * Contenu UTF-8 équivalent au fichier téléchargé (sans BOM ; le BOM est ajouté au téléchargement).
 */
export function buildCsvTemplateFileBody(exampleDataRow: string): string {
  const hashLines = buildCommentPreambleLines()
    .map((line) => (line === "" ? "#" : `# ${line}`))
    .join("\n");
  const header = CSV_COLUMNS.join(",");
  return `${hashLines}\n${header}\n${exampleDataRow}\n`;
}
