export const CSV_COLUMNS = [
  "company",
  "job_title",
  "contract_type",
  "location",
  "work_mode",
  "source",
  "job_url",
  "date_found",
  "date_applied",
  "status",
  "priority",
  "salary",
  "contact_name",
  "contact_email",
  "follow_up_date",
  "notes",
] as const;

export const ENUM_VALUES = {
  contract_type: ["cdi", "cdd", "freelance", "alternance", "stage", "autre", ""],
  work_mode: ["remote", "hybride", "présentiel", ""],
  status: [
    "à envoyer",
    "envoyée",
    "relance à faire",
    "entretien rh",
    "entretien technique",
    "test technique",
    "en attente",
    "refusée",
    "offre reçue",
    "acceptée",
    "",
  ],
  priority: ["basse", "moyenne", "haute", ""],
} as const;

export const DEFAULTS = {
  status: "à envoyer",
  priority: "moyenne",
  contract_type: "",
  work_mode: "",
} as const;

export const PIPELINE_STATUSES: {
  key: string;
  label: string;
  color: string;
}[] = [
  { key: "à envoyer", label: "À envoyer", color: "#64748b" },
  { key: "envoyée", label: "Envoyée", color: "#E8602C" },
  { key: "relance à faire", label: "Relance", color: "#D4A017" },
  { key: "entretien rh", label: "Entretien", color: "#00C8E0" },
  { key: "entretien technique", label: "Tech", color: "#00C8E0" },
  { key: "test technique", label: "Test", color: "#A855F7" },
  { key: "en attente", label: "Attente", color: "#C084FC" },
  { key: "offre reçue", label: "Offre", color: "#EAB308" },
  { key: "acceptée", label: "Acceptée", color: "#22C55E" },
  { key: "refusée", label: "Refusée", color: "#E85D4C" },
];
