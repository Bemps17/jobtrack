export type Candidature = {
  id: string;
  company: string;
  job_title: string;
  contract_type: string;
  location: string;
  work_mode: string;
  source: string;
  job_url: string;
  date_found: string;
  date_applied: string;
  status: string;
  priority: string;
  salary: string;
  contact_name: string;
  contact_email: string;
  follow_up_date: string;
  notes: string;
  _createdAt: string;
  _updatedAt?: string;
};

export type DuplicatePair = {
  imported: Candidature;
  existing: Candidature;
};

export type ListFilters = {
  search: string;
  status: string;
  contract: string;
  priority: string;
  sort: "date_desc" | "date_asc" | "company" | "priority";
};
