import { today } from "./candidature-utils";
import { buildCsvTemplateFileBody } from "./csv-template-content";

export function downloadCsvTemplate(toast: (msg: string) => void) {
  const example = [
    '"Acme Corp"',
    '"Développeur Front-End"',
    '"CDI"',
    '"Paris"',
    '"hybride"',
    '"LinkedIn"',
    '"https://example.com/offre"',
    `"${today()}"`,
    '""',
    '"à envoyer"',
    '"haute"',
    '"45k-55k"',
    '"Sophie Martin"',
    '"s.martin@acme.com"',
    '""',
    '"React TypeScript, produit SaaS"',
  ].join(",");

  const body = buildCsvTemplateFileBody(example);
  const blob = new Blob(["\uFEFF" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele_candidatures.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Modèle CSV téléchargé ✓");
}
