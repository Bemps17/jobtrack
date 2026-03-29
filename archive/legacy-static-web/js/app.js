/* ═══════════════════════════════════════════════════════════════════════
   JOBTRACK — logique applicative (SPA sans framework)
   Chargé par index.html : <script src="js/app.js">
   Styles : assets/css/style.css + bloc <style> dans index.html
   Persistance : GET/PUT /api/candidatures (voir apps/api) si ouvert via http ; file:// = démo
   Option : window.__JOBTRACK_API__ = "http://hôte:port" (sans slash final)
   Flux CSV : parseCSVFile → detectDuplicates → showDuplicateResolver → finalizeImport
═══════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  1. CONFIGURATION
   ╚═══════════════════════════════════════════════════════════════════════ */

const CSV_COLUMNS = [
  'company','job_title','contract_type','location','work_mode',
  'source','job_url','date_found','date_applied','status',
  'priority','salary','contact_name','contact_email','follow_up_date','notes'
];

const ENUM_VALUES = {
  contract_type: ['cdi','cdd','freelance','alternance','stage','autre',''],
  work_mode:     ['remote','hybride','présentiel',''],
  status: [
    'à envoyer','envoyée','relance à faire','entretien rh',
    'entretien technique','test technique','en attente',
    'refusée','offre reçue','acceptée',''
  ],
  priority: ['basse','moyenne','haute','']
};

const DEFAULTS = {
  status:        'à envoyer',
  priority:      'moyenne',
  contract_type: '',
  work_mode:     ''
};

/** Ordre des statuts pour le pipeline */
const PIPELINE_STATUSES = [
  { key: 'à envoyer',          label: 'À envoyer',  color: '#64748b' },
  { key: 'envoyée',            label: 'Envoyée',    color: '#4f8ef7' },
  { key: 'relance à faire',    label: 'Relance',    color: '#fbbf24' },
  { key: 'entretien rh',       label: 'Entretien',  color: '#6ee7b7' },
  { key: 'entretien technique',label: 'Tech',       color: '#6ee7b7' },
  { key: 'test technique',     label: 'Test',       color: '#a78bfa' },
  { key: 'en attente',         label: 'Attente',    color: '#a78bfa' },
  { key: 'offre reçue',        label: 'Offre',      color: '#fde68a' },
  { key: 'acceptée',           label: 'Acceptée',   color: '#4ade80' },
  { key: 'refusée',            label: 'Refusée',    color: '#f87171' },
];

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  2. ÉTAT GLOBAL
   ╚═══════════════════════════════════════════════════════════════════════ */

const State = {
  /** @type {Array<Object>} Tableau principal des candidatures */
  candidatures: [],

  /** @type {Object|null} Candidature en cours d'édition (null = création) */
  editing: null,

  /** @type {Object|null} Candidature affichée dans le détail */
  detailId: null,

  /** @type {Array<Object>} Import CSV en attente de confirmation */
  pendingImport: [],

  /** @type {Array<Object>} Doublons détectés lors de l'import */
  duplicates: [],

  /** @type {string} Vue active */
  view: 'dashboard',

  /** Filtres & tri actifs */
  filters: {
    search:   '',
    status:   '',
    contract: '',
    priority: '',
    sort:     'date_desc'
  }
};

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  2b. API — persistance (backend intégré)
   ╚═══════════════════════════════════════════════════════════════════════ */

const API_BASE =
  typeof window !== 'undefined' && window.__JOBTRACK_API__ != null && window.__JOBTRACK_API__ !== ''
    ? String(window.__JOBTRACK_API__).replace(/\/$/, '')
    : '';

function canUseApi() {
  return typeof location !== 'undefined' && location.protocol !== 'file:';
}

/** Enregistre tout le tableau courant sur le serveur (remplace le fichier JSON). */
async function persistCandidatures() {
  if (!canUseApi()) return;
  try {
    const r = await fetch(`${API_BASE}/api/candidatures`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.candidatures),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || r.statusText);
    }
  } catch (e) {
    console.error(e);
    toast('Sauvegarde serveur impossible.', 'error');
  }
}

/** Charge les candidatures ; si base vide, ensemence avec SAMPLE_DATA et persiste une fois. */
async function loadCandidaturesFromApi() {
  if (!canUseApi()) {
    State.candidatures = SAMPLE_DATA;
    return;
  }
  try {
    const r = await fetch(`${API_BASE}/api/candidatures`);
    if (!r.ok) throw new Error(r.statusText);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Réponse invalide');
    if (data.length === 0) {
      State.candidatures = SAMPLE_DATA;
      await persistCandidatures();
    } else {
      State.candidatures = data;
    }
  } catch (e) {
    console.warn('API indisponible, mode démo.', e);
    State.candidatures = SAMPLE_DATA;
    toast("Serveur injoignable — données d'exemple (non sauvegardées).", 'error');
  }
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  3. DONNÉES D'EXEMPLE
   ╚═══════════════════════════════════════════════════════════════════════ */

const SAMPLE_DATA = [
  {
    id: uid(), company: 'Doctolib', job_title: 'Frontend Developer',
    contract_type: 'CDI', location: 'Paris', work_mode: 'hybride',
    source: 'LinkedIn', job_url: 'https://doctolib.fr/jobs',
    date_found: '2026-03-10', date_applied: '2026-03-12',
    status: 'entretien RH', priority: 'haute',
    salary: '50k–60k', contact_name: 'Marie Dupont', contact_email: 'marie@doctolib.fr',
    follow_up_date: '2026-03-25',
    notes: 'React TypeScript, produit SaaS médical. Entretien prévu le 22/03.',
    _createdAt: '2026-03-12T09:00:00.000Z'
  },
  {
    id: uid(), company: 'Pennylane', job_title: 'UX Designer',
    contract_type: 'CDI', location: 'Paris', work_mode: 'remote',
    source: 'Welcome to the Jungle', job_url: '',
    date_found: '2026-03-15', date_applied: '2026-03-16',
    status: 'envoyée', priority: 'haute',
    salary: '45k–52k', contact_name: '', contact_email: '',
    follow_up_date: '2026-03-26',
    notes: 'Stack Figma, Design System. Produit fintech B2B.',
    _createdAt: '2026-03-16T10:00:00.000Z'
  },
  {
    id: uid(), company: 'BlaBlaCar', job_title: 'Lead Front-End',
    contract_type: 'CDI', location: 'Paris', work_mode: 'hybride',
    source: 'site carrière', job_url: 'https://blablacar.com/careers',
    date_found: '2026-03-18', date_applied: '',
    status: 'à envoyer', priority: 'moyenne',
    salary: '', contact_name: '', contact_email: '',
    follow_up_date: '',
    notes: 'Vue 3 + Nuxt. Niveau Lead requis.',
    _createdAt: '2026-03-18T14:00:00.000Z'
  },
  {
    id: uid(), company: 'Contentsquare', job_title: 'Software Engineer Front',
    contract_type: 'CDI', location: 'Paris', work_mode: 'hybride',
    source: 'LinkedIn', job_url: '',
    date_found: '2026-03-20', date_applied: '2026-03-21',
    status: 'test technique', priority: 'haute',
    salary: '55k–65k', contact_name: 'Paul Renard', contact_email: 'p.renard@cs.com',
    follow_up_date: '2026-04-01',
    notes: 'Angular ou React. Test: kata en 4h.',
    _createdAt: '2026-03-21T08:00:00.000Z'
  },
  {
    id: uid(), company: 'Leboncoin', job_title: 'Développeur React',
    contract_type: 'CDI', location: 'Paris', work_mode: 'présentiel',
    source: 'Indeed', job_url: '',
    date_found: '2026-03-22', date_applied: '2026-03-23',
    status: 'refusée', priority: 'basse',
    salary: '42k–48k', contact_name: '', contact_email: '',
    follow_up_date: '',
    notes: 'Réponse négative reçue le 25/03. Pas de feedback.',
    _createdAt: '2026-03-23T09:00:00.000Z'
  },
  {
    id: uid(), company: 'Backmarket', job_title: 'Frontend Engineer',
    contract_type: 'CDI', location: 'Paris', work_mode: 'hybride',
    source: 'candidature spontanée', job_url: '',
    date_found: '2026-03-24', date_applied: '2026-03-24',
    status: 'relance à faire', priority: 'moyenne',
    salary: '50k–58k', contact_name: '', contact_email: '',
    follow_up_date: '2026-03-31',
    notes: 'React + TypeScript. Équipe produit. Envoyer relance fin mars.',
    _createdAt: '2026-03-24T11:00:00.000Z'
  },
  {
    id: uid(), company: 'Mirakl', job_title: 'Intégrateur Web Freelance',
    contract_type: 'freelance', location: 'Remote', work_mode: 'remote',
    source: 'LinkedIn', job_url: '',
    date_found: '2026-03-26', date_applied: '2026-03-27',
    status: 'en attente', priority: 'moyenne',
    salary: '500 €/j', contact_name: 'Alice Moreau', contact_email: 'a.moreau@mirakl.com',
    follow_up_date: '2026-04-03',
    notes: 'Mission 3 mois renouvelable. Full remote.',
    _createdAt: '2026-03-27T09:00:00.000Z'
  },
];

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  4. UTILITAIRES
   ╚═══════════════════════════════════════════════════════════════════════ */

/** Génère un ID unique court */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Normalise une chaîne (trim + lowercase) */
function norm(v) { return (v ?? '').trim().toLowerCase(); }

/** Échappe les caractères HTML dangereux */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Formate une date ISO → lisible (ex: "29 mars 2026") */
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' });
  } catch { return iso; }
}

/** Retourne la date d'aujourd'hui au format YYYY-MM-DD */
function today() {
  return new Date().toISOString().split('T')[0];
}

/** Affiche un toast */
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) {
    console.error('Toast element not found');
    alert(msg);
    return;
  }
  el.textContent = msg;
  el.className = `show toast-${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 3200);
}

/** Retourne la classe badge CSS selon le statut */
function badgeClass(status) {
  const map = {
    'à envoyer':           'badge-envoyer',
    'envoyée':             'badge-envoyee',
    'relance à faire':     'badge-relance',
    'entretien rh':        'badge-entretien',
    'entretien technique': 'badge-entretien',
    'test technique':      'badge-entretien',
    'en attente':          'badge-attente',
    'refusée':             'badge-refuse',
    'offre reçue':         'badge-offre',
    'acceptée':            'badge-offre',
  };
  return map[norm(status)] ?? 'badge-default';
}

/** Détecte les doublons entre deux candidatures */
function isDuplicate(c1, c2) {
  const company1 = norm(c1.company);
  const company2 = norm(c2.company);
  const job1 = norm(c1.job_title);
  const job2 = norm(c2.job_title);
  
  // Doublon si même entreprise ET même poste (ou poste très similaire)
  if (company1 === company2 && company1 !== '') {
    // Soit même poste exact, soit poste similaire (contient les mêmes mots clés)
    if (job1 === job2) return true;
    
    // Vérifier la similarité des postes (mots clés communs)
    const words1 = job1.split(/\s+/).filter(w => w.length > 2);
    const words2 = job2.split(/\s+/).filter(w => w.length > 2);
    const common = words1.filter(w => words2.includes(w));
    if (common.length >= 2) return true;
  }
  
  return false;
}

/** Fusionne deux candidatures */
function mergeCandidatures(existing, imported) {
  return {
    ...existing,
    // Garder les valeurs non vides de l'import
    ...Object.fromEntries(
      Object.entries(imported).filter(([k, v]) => v && v !== '' && k !== 'id' && k !== '_createdAt')
    ),
    // Si l'import a une date de candidature plus récente, la garder
    date_applied: imported.date_applied || existing.date_applied,
    // Fusionner les notes
    notes: [existing.notes, imported.notes].filter(Boolean).join('\n\n---\n\n'),
    _updatedAt: new Date().toISOString()
  };
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  5. RENDU — KPIs
   ╚═══════════════════════════════════════════════════════════════════════ */

function renderKPIs() {
  const C = State.candidatures;
  const total      = C.length;
  const envoye     = C.filter(c => norm(c.status) !== 'à envoyer' && norm(c.status) !== '').length;
  const entretiens = C.filter(c => ['entretien rh','entretien technique','test technique'].includes(norm(c.status))).length;
  const refus      = C.filter(c => norm(c.status) === 'refusée').length;
  const relances   = C.filter(c => norm(c.status) === 'relance à faire').length;
  const offres     = C.filter(c => ['offre reçue','acceptée'].includes(norm(c.status))).length;
  const taux       = envoye > 0 ? Math.round((entretiens / envoye) * 100) : 0;

  const kpis = [
    { val: total,      lbl: 'Total',          cls: 'accent' },
    { val: envoye,     lbl: 'Envoyées',        cls: '' },
    { val: entretiens, lbl: 'Entretiens',      cls: 'green' },
    { val: refus,      lbl: 'Refus',           cls: refus > 0 ? 'danger' : '' },
    { val: relances,   lbl: 'Relances dues',   cls: relances > 0 ? 'warn' : '' },
    { val: offres,     lbl: 'Offres reçues',   cls: offres > 0 ? 'green' : '' },
    { val: taux + '%', lbl: 'Taux entretiens', cls: '' },
  ];

  const kpiGrid = document.getElementById('kpi-grid');
  if (kpiGrid) {
    kpiGrid.innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.cls}">
        <span class="kpi-val">${k.val}</span>
        <div class="kpi-lbl">${k.lbl}</div>
      </div>
    `).join('');
  }

  /* Badge nav relances */
  const badge = document.getElementById('relance-badge');
  if (badge) {
    badge.textContent = relances;
    badge.dataset.count = relances;
  }
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  6. RENDU — PIPELINE
   ╚═══════════════════════════════════════════════════════════════════════ */

function renderPipeline() {
  const C = State.candidatures;
  const max = Math.max(1, ...PIPELINE_STATUSES.map(s =>
    C.filter(c => norm(c.status) === s.key).length
  ));

  const pipeline = document.getElementById('pipeline');
  if (!pipeline) return;

  pipeline.innerHTML = PIPELINE_STATUSES.map(s => {
    const count  = C.filter(c => norm(c.status) === s.key).length;
    const height = count === 0 ? 4 : Math.max(6, Math.round((count / max) * 70));
    return `
      <div class="pipeline-col">
        <span class="pipeline-count">${count}</span>
        <div class="pipeline-bar-wrap">
          <div class="pipeline-bar" style="height:${height}px;background:${s.color};opacity:${count === 0 ? .2 : .85}"></div>
        </div>
        <span class="pipeline-label">${s.label}</span>
      </div>
    `;
  }).join('');
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  7. RENDU — LISTE RÉCENTE (Dashboard)
   ╚═══════════════════════════════════════════════════════════════════════ */

function renderRecent() {
  const recent = State.candidatures
    .slice()
    .sort((a, b) => (b._createdAt ?? '').localeCompare(a._createdAt ?? ''))
    .slice(0, 5);

  const el = document.getElementById('recent-list');
  if (!el) return;

  if (recent.length === 0) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>Aucune candidature pour l'instant.</p></div>`;
    return;
  }
  el.innerHTML = recent.map(c => `
    <div class="recent-row" data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="Voir ${esc(c.company)}">
      <div class="rr-company">${esc(c.company)}</div>
      <div class="rr-job">${esc(c.job_title)}</div>
      <span class="badge ${badgeClass(c.status)}">${esc(c.status || '—')}</span>
      <span class="rr-date">${fmtDate(c.date_applied || c.date_found)}</span>
    </div>
  `).join('');

  el.querySelectorAll('.recent-row').forEach(row => {
    const open = () => openDetail(row.dataset.id);
    row.addEventListener('click', open);
    row.addEventListener('keydown', e => e.key === 'Enter' && open());
  });
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  8. RENDU — CARDS LISTE (vue list + relances)
   ╚═══════════════════════════════════════════════════════════════════════ */

/** Filtre + trie les candidatures selon State.filters */
function getFiltered() {
  const f = State.filters;
  let list = State.candidatures.filter(c => {
    if (f.search) {
      const q = norm(f.search);
      if (!norm(c.company).includes(q) && !norm(c.job_title).includes(q)) return false;
    }
    if (f.status   && norm(c.status)        !== norm(f.status))   return false;
    if (f.contract && norm(c.contract_type) !== norm(f.contract)) return false;
    if (f.priority && norm(c.priority)      !== norm(f.priority)) return false;
    return true;
  });

  switch (f.sort) {
    case 'date_asc':  list.sort((a,b) => (a._createdAt??'').localeCompare(b._createdAt??'')); break;
    case 'company':   list.sort((a,b) => norm(a.company).localeCompare(norm(b.company))); break;
    case 'priority': {
      const order = { haute: 0, moyenne: 1, basse: 2 };
      list.sort((a,b) => (order[norm(a.priority)]??2) - (order[norm(b.priority)]??2)); break;
    }
    default: list.sort((a,b) => (b._createdAt??'').localeCompare(a._createdAt??'')); // date_desc
  }
  return list;
}

/** Crée un élément card */
function createCard(c) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = c.id;
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${c.company} — ${c.job_title}`);

  const chips = [c.contract_type, c.location, c.work_mode]
    .filter(Boolean)
    .map(v => `<span class="card-chip">${esc(v)}</span>`)
    .join('');

  const prioClass = norm(c.priority);

  el.innerHTML = `
    <div class="card-head">
      <div>
        <div class="card-company">
          <span class="priority-dot ${prioClass}" title="Priorité ${esc(c.priority)}"></span>
          ${esc(c.company)}
        </div>
        <div class="card-job">${esc(c.job_title)}</div>
      </div>
      <span class="badge ${badgeClass(c.status)}">${esc(c.status || '—')}</span>
    </div>
    ${chips ? `<div class="card-meta">${chips}</div>` : ''}
    <div class="card-footer">
      <span>${fmtDate(c.date_applied || c.date_found)}</span>
      <div class="card-actions">
        <button class="card-btn edit"   data-id="${esc(c.id)}" title="Modifier"   aria-label="Modifier ${esc(c.company)}">✎</button>
        <button class="card-btn delete" data-id="${esc(c.id)}" title="Supprimer"  aria-label="Supprimer ${esc(c.company)}">✕</button>
      </div>
    </div>
    ${c.notes ? `<div style="font-size:11px;color:var(--text2);border-top:1px solid var(--border);padding-top:8px;margin-top:0">${esc(c.notes.slice(0,80))}${c.notes.length>80?'…':''}</div>` : ''}
  `;

  el.addEventListener('click', e => {
    if (e.target.closest('.card-btn')) return;
    openDetail(c.id);
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.target.closest('.card-btn')) openDetail(c.id);
  });
  
  const editBtn = el.querySelector('.card-btn.edit');
  const deleteBtn = el.querySelector('.card-btn.delete');
  
  if (editBtn) {
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      openFormEdit(c.id);
    });
  }
  if (deleteBtn) {
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteCandidat(c.id);
    });
  }

  return el;
}

function renderList() {
  const grid  = document.getElementById('cards-grid');
  const count = document.getElementById('list-count');
  if (!grid) return;
  
  const list  = getFiltered();

  grid.innerHTML = '';
  if (count) count.textContent = list.length;

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><p>Aucune candidature ne correspond à votre recherche.</p></div>`;
    return;
  }
  list.forEach(c => grid.appendChild(createCard(c)));
}

function renderRelances() {
  const grid = document.getElementById('relances-grid');
  if (!grid) return;
  
  const list = State.candidatures.filter(c => norm(c.status) === 'relance à faire');
  grid.innerHTML = '';
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🎉</span><p>Aucune relance en attente. Bravo !</p></div>`;
    return;
  }
  list.forEach(c => grid.appendChild(createCard(c)));
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  9. RENDU — GLOBAL
   ╚═══════════════════════════════════════════════════════════════════════ */

function refreshAll() {
  renderKPIs();
  renderPipeline();
  renderRecent();
  renderList();
  renderRelances();
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  10. NAVIGATION VIEWS
   ╚═══════════════════════════════════════════════════════════════════════ */

function switchView(viewName) {
  State.view = viewName;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.remove('active'));

  const viewEl = document.getElementById(`view-${viewName}`);
  if (viewEl) viewEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navEl) navEl.classList.add('active');

  /* Fermer sidebar mobile */
  closeMobileSidebar();
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  11. FORMULAIRE AJOUT / ÉDITION
   ╚═══════════════════════════════════════════════════════════════════════ */

function openFormNew() {
  State.editing = null;
  const modalTitle = document.getElementById('modal-form-title');
  if (modalTitle) modalTitle.textContent = 'Nouvelle candidature';
  clearForm();
  
  const dateFound = document.getElementById('f-date-found');
  const status = document.getElementById('f-status');
  const priority = document.getElementById('f-priority');
  
  if (dateFound) dateFound.value = today();
  if (status) status.value = 'à envoyer';
  if (priority) priority.value = 'moyenne';
  
  openModal('modal-form');
}

function openFormEdit(id) {
  const c = State.candidatures.find(x => x.id === id);
  if (!c) return;
  State.editing = id;
  const modalTitle = document.getElementById('modal-form-title');
  if (modalTitle) modalTitle.textContent = 'Modifier la candidature';
  fillForm(c);
  closeModal('modal-detail');
  openModal('modal-form');
}

function clearForm() {
  const fields = ['f-company','f-job-title','f-location','f-salary','f-job-url',
   'f-notes','f-contact-name','f-contact-email','f-followup',
   'f-date-found','f-date-applied'];
  
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  const selects = ['f-contract', 'f-work-mode', 'f-source', 'f-status', 'f-priority'];
  const defaults = ['', '', '', 'à envoyer', 'moyenne'];
  
  selects.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.value = defaults[i];
  });
}

function fillForm(c) {
  const s = (id, val) => { 
    const el = document.getElementById(id); 
    if (el) el.value = val ?? ''; 
  };
  s('f-company',      c.company);
  s('f-job-title',    c.job_title);
  s('f-contract',     c.contract_type);
  s('f-location',     c.location);
  s('f-work-mode',    c.work_mode);
  s('f-status',       c.status);
  s('f-priority',     c.priority);
  s('f-source',       c.source);
  s('f-salary',       c.salary);
  s('f-job-url',      c.job_url);
  s('f-date-found',   c.date_found);
  s('f-date-applied', c.date_applied);
  s('f-notes',        c.notes);
  s('f-contact-name', c.contact_name);
  s('f-contact-email',c.contact_email);
  s('f-followup',     c.follow_up_date);
}

function readForm() {
  const g = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  return {
    company:       g('f-company'),
    job_title:     g('f-job-title'),
    contract_type: g('f-contract'),
    location:      g('f-location'),
    work_mode:     g('f-work-mode'),
    status:        g('f-status'),
    priority:      g('f-priority'),
    source:        g('f-source'),
    salary:        g('f-salary'),
    job_url:       g('f-job-url'),
    date_found:    g('f-date-found'),
    date_applied:  g('f-date-applied'),
    notes:         g('f-notes'),
    contact_name:  g('f-contact-name'),
    contact_email: g('f-contact-email'),
    follow_up_date:g('f-followup'),
  };
}

async function saveForm() {
  const data = readForm();
  if (!data.company.trim())   { toast('Le champ "Entreprise" est requis.', 'error'); return; }
  if (!data.job_title.trim()) { toast('Le champ "Poste" est requis.', 'error'); return; }

  if (State.editing) {
    /* Mise à jour */
    const idx = State.candidatures.findIndex(c => c.id === State.editing);
    if (idx !== -1) {
      State.candidatures[idx] = { ...State.candidatures[idx], ...data };
      toast('Candidature mise à jour ✓');
    }
  } else {
    /* Création */
    State.candidatures.unshift({
      id: uid(),
      ...data,
      _createdAt: new Date().toISOString()
    });
    toast('Candidature ajoutée ✓');
  }

  closeModal('modal-form');
  refreshAll();
  await persistCandidatures();
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  12. DÉTAIL
   ╚═══════════════════════════════════════════════════════════════════════ */

function openDetail(id) {
  const c = State.candidatures.find(x => x.id === id);
  if (!c) return;
  State.detailId = id;

  const detailTitle = document.getElementById('detail-title');
  const detailJob = document.getElementById('detail-job');
  const detailBody = document.getElementById('detail-body');
  
  if (detailTitle) detailTitle.textContent = c.company;
  if (detailJob) detailJob.textContent = c.job_title;

  const row = (lbl, val) => val ? `
    <div class="detail-item">
      <div class="detail-lbl">${lbl}</div>
      <div class="detail-val">${val}</div>
    </div>` : '';

  if (detailBody) {
    detailBody.innerHTML = `
      <div style="margin-bottom:14px">
        <span class="badge ${badgeClass(c.status)}">${esc(c.status || '—')}</span>
        ${c.priority ? `<span style="margin-left:8px;font-size:11px;color:var(--text2)">
          <span class="priority-dot ${norm(c.priority)}"></span>${esc(c.priority)}
        </span>` : ''}
      </div>
      <div class="detail-grid">
        ${row('Contrat',    esc(c.contract_type))}
        ${row('Localisation', esc(c.location))}
        ${row('Mode',       esc(c.work_mode))}
        ${row('Source',     esc(c.source))}
        ${row('Salaire',    esc(c.salary))}
        ${row('Trouvée le', fmtDate(c.date_found))}
        ${row('Postulée le',fmtDate(c.date_applied))}
        ${row('Relance le', fmtDate(c.follow_up_date))}
        ${row('Contact',    esc(c.contact_name))}
        ${row('Email',      c.contact_email ? `<a href="mailto:${esc(c.contact_email)}">${esc(c.contact_email)}</a>` : '')}
        ${c.job_url ? `<div class="detail-item" style="grid-column:1/-1">
          <div class="detail-lbl">URL</div>
          <div class="detail-val"><a href="${esc(c.job_url)}" target="_blank" rel="noopener">${esc(c.job_url)}</a></div>
        </div>` : ''}
      </div>
      ${c.notes ? `<div class="detail-lbl" style="margin-bottom:6px">Notes</div>
        <div class="detail-notes">${esc(c.notes)}</div>` : ''}
    `;
  }

  openModal('modal-detail');
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  13. SUPPRESSION
   ╚═══════════════════════════════════════════════════════════════════════ */

async function deleteCandidat(id) {
  const c = State.candidatures.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Supprimer "${c.company} – ${c.job_title}" ?`)) return;
  State.candidatures = State.candidatures.filter(x => x.id !== id);
  closeModal('modal-detail');
  refreshAll();
  toast('Candidature supprimée');
  await persistCandidatures();
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  14. IMPORT CSV — PARSING & VALIDATION
   ╚═══════════════════════════════════════════════════════════════════════ */

function validateHeaders(headers) {
  const required = ['company', 'job_title'];
  const normalized = headers.map(norm);
  const missing = required.filter(r => !normalized.includes(r));
  return { ok: missing.length === 0, missing };
}

function mapRow(raw, lineNum) {
  const get = key => (raw[key] ?? '').trim();

  const company   = get('company');
  const job_title = get('job_title');

  if (!company)   return { data: null, error: `Ligne ${lineNum} : "company" vide.` };
  if (!job_title) return { data: null, error: `Ligne ${lineNum} : "job_title" vide.` };

  function mapEnum(field, value) {
    if (!value) return DEFAULTS[field] ?? '';
    const allowed = ENUM_VALUES[field];
    if (!allowed) return value;
    const match = allowed.find(a => a === norm(value));
    return match !== undefined ? (match || value) : value;
  }

  return {
    data: {
      id:            uid(),
      company,
      job_title,
      contract_type: mapEnum('contract_type', get('contract_type')),
      location:      get('location'),
      work_mode:     mapEnum('work_mode', get('work_mode')),
      source:        get('source'),
      job_url:       get('job_url'),
      date_found:    get('date_found'),
      date_applied:  get('date_applied'),
      status:        mapEnum('status',   get('status'))   || DEFAULTS.status,
      priority:      mapEnum('priority', get('priority')) || DEFAULTS.priority,
      salary:        get('salary'),
      contact_name:  get('contact_name'),
      contact_email: get('contact_email'),
      follow_up_date:get('follow_up_date'),
      notes:         get('notes'),
      _createdAt:    new Date().toISOString(),
    },
    error: null
  };
}

function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    if (typeof Papa === 'undefined') {
      reject(new Error('Papa Parse n\'est pas chargé. Veuillez inclure la bibliothèque PapaParse.'));
      return;
    }
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete(results) {
        const { ok, missing } = validateHeaders(results.meta.fields ?? []);
        if (!ok) return reject(new Error(`Colonnes manquantes : ${missing.join(', ')}`));

        const valid  = [];
        const errors = [];
        results.data.forEach((row, i) => {
          const { data, error } = mapRow(row, i + 2);
          if (data)  valid.push(data);
          if (error) errors.push(error);
        });
        resolve({ valid, errors, total: results.data.length });
      },
      error(err) { reject(new Error(`Lecture impossible : ${err.message}`)); }
    });
  });
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  15. IMPORT CSV — GESTION DES DOUBLONS
   ╚═══════════════════════════════════════════════════════════════════════ */

/** Détecte et gère les doublons lors de l'import */
function detectDuplicates(imported) {
  const duplicates = [];
  const newItems = [];
  
  imported.forEach(item => {
    const existing = State.candidatures.find(c => isDuplicate(c, item));
    if (existing) {
      duplicates.push({ imported: item, existing });
    } else {
      newItems.push(item);
    }
  });
  
  return { duplicates, newItems };
}

/** Affiche l'interface de résolution des doublons */
function showDuplicateResolver() {
  const container = document.getElementById('duplicate-container');
  if (!container || State.duplicates.length === 0) return;
  
  container.innerHTML = State.duplicates.map((dup, index) => `
    <div class="duplicate-item" data-index="${index}">
      <div class="duplicate-header">
        <span class="badge badge-warn">⚠ Doublon détecté</span>
        <span class="duplicate-company">${esc(dup.imported.company)}</span>
      </div>
      <div class="duplicate-comparison">
        <div class="duplicate-side">
          <h4>Existant</h4>
          <p><strong>${esc(dup.existing.job_title)}</strong></p>
          <p>Statut: ${esc(dup.existing.status)}</p>
          <p>Date: ${fmtDate(dup.existing.date_applied)}</p>
        </div>
        <div class="duplicate-vs">VS</div>
        <div class="duplicate-side">
          <h4>Import</h4>
          <p><strong>${esc(dup.imported.job_title)}</strong></p>
          <p>Statut: ${esc(dup.imported.status)}</p>
          <p>Date: ${fmtDate(dup.imported.date_applied)}</p>
        </div>
      </div>
      <div class="duplicate-actions">
        <button class="btn btn-sm btn-secondary" onclick="resolveDuplicate(${index}, 'skip')">Ignorer</button>
        <button class="btn btn-sm btn-primary" onclick="resolveDuplicate(${index}, 'replace')">Remplacer</button>
        <button class="btn btn-sm btn-accent" onclick="resolveDuplicate(${index}, 'merge')">Fusionner</button>
      </div>
    </div>
  `).join('');
  
  openModal('duplicate-modal');
}

/** Applique la même action (fusion / remplacement / ignorer) à tous les doublons en attente. */
async function resolveAllDuplicates(action) {
  while (State.duplicates.length > 0) {
    await resolveDuplicate(0, action);
  }
}

/** Résout un doublon selon l'action choisie */
async function resolveDuplicate(index, action) {
  const dup = State.duplicates[index];
  if (!dup) return;
  
  switch(action) {
    case 'replace':
      const idx = State.candidatures.findIndex(c => c.id === dup.existing.id);
      if (idx !== -1) {
        State.candidatures[idx] = { ...dup.imported, id: dup.existing.id, _createdAt: dup.existing._createdAt };
      }
      toast('Candidature remplacée ✓');
      break;
    case 'merge':
      const mergeIdx = State.candidatures.findIndex(c => c.id === dup.existing.id);
      if (mergeIdx !== -1) {
        State.candidatures[mergeIdx] = mergeCandidatures(dup.existing, dup.imported);
      }
      toast('Candidatures fusionnées ✓');
      break;
    case 'skip':
    default:
      // Ne rien faire, garder l'existant
      break;
  }
  
  // Retirer le doublon traité
  State.duplicates.splice(index, 1);
  
  refreshAll();
  if (State.duplicates.length === 0) {
    closeModal('duplicate-modal');
    await finalizeImport();
  } else {
    showDuplicateResolver();
    await persistCandidatures();
  }
}

/** Finalise l'import : fusionne les nouvelles lignes puis ferme le modal (même si seulement des doublons ont été traités). */
async function finalizeImport() {
  if (State.pendingImport.length > 0) {
    State.candidatures = [...State.candidatures, ...State.pendingImport];
    const count = State.pendingImport.length;
    State.pendingImport = [];
    toast(`${count} candidature(s) importée(s) ✓`);
  }
  closeModal('modal-import');
  refreshAll();
  await persistCandidatures();
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  16. IMPORT CSV — UI
   ╚═══════════════════════════════════════════════════════════════════════ */

async function handleCSVFile(file) {
  if (!file?.name.match(/\.csv$/i)) {
    toast('Sélectionnez un fichier .csv', 'error');
    return;
  }
  resetImportUI();
  setProgress(15);

  try {
    const { valid, errors, total } = await parseCSVFile(file);
    setProgress(100);
    
    // Détecter les doublons
    const { duplicates, newItems } = detectDuplicates(valid);
    State.pendingImport = newItems;
    State.duplicates = duplicates;
    
    showImportSummary({ 
      total, 
      imported: newItems.length, 
      rejected: errors.length, 
      duplicates: duplicates.length,
      errors 
    });
    
    const confirmBtn = document.getElementById('btn-import-confirm');
    if (confirmBtn) confirmBtn.disabled = newItems.length === 0 && duplicates.length === 0;
    
    // Si des doublons existent, montrer le résolveur
    if (duplicates.length > 0) {
      setTimeout(() => showDuplicateResolver(), 500);
    }
  } catch (err) {
    toast(err.message, 'error');
    resetImportUI();
  } finally {
    setTimeout(() => setProgress(0, false), 700);
  }
}

async function confirmImport() {
  if (State.duplicates.length > 0) {
    showDuplicateResolver();
    return;
  }
  await finalizeImport();
}

function resetImportUI() {
  const importSummary = document.getElementById('import-summary');
  const errorsList = document.getElementById('errors-list');
  const errorsContainer = document.getElementById('errors-container');
  const confirmBtn = document.getElementById('btn-import-confirm');
  
  if (importSummary) importSummary.classList.remove('visible');
  if (errorsList) errorsList.classList.remove('visible');
  if (errorsContainer) errorsContainer.innerHTML = '';
  if (confirmBtn) confirmBtn.disabled = true;
  
  // Reset doublons
  State.duplicates = [];
  const dupContainer = document.getElementById('duplicate-container');
  if (dupContainer) dupContainer.innerHTML = '';
}

function showImportSummary({ total, imported, rejected, duplicates, errors }) {
  const sTotal = document.getElementById('s-total');
  const sImported = document.getElementById('s-imported');
  const sRejected = document.getElementById('s-rejected');
  const sDuplicates = document.getElementById('s-duplicates');
  const errorsList = document.getElementById('errors-list');
  const errorsContainer = document.getElementById('errors-container');
  const importSummary = document.getElementById('import-summary');
  
  if (sTotal) sTotal.textContent = total;
  if (sImported) sImported.textContent = imported;
  if (sRejected) sRejected.textContent = rejected;
  if (sDuplicates) sDuplicates.textContent = duplicates || 0;

  if (errors.length > 0 && errorsList && errorsContainer) {
    errorsList.classList.add('visible');
    errorsContainer.innerHTML = errors.map(e => `<div class="error-row">${esc(e)}</div>`).join('');
  }
  if (importSummary) importSummary.classList.add('visible');
}

function setProgress(pct, show = true) {
  const wrap = document.getElementById('progress-wrap');
  const bar  = document.getElementById('progress-bar');
  if (!wrap || !bar) return;
  
  wrap.classList.toggle('visible', show && pct > 0 && pct < 100);
  bar.style.width = pct + '%';
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  17. EXPORT — MODÈLE CSV
   ╚═══════════════════════════════════════════════════════════════════════ */

function downloadTemplate() {
  const header  = CSV_COLUMNS.join(',');
  const example = [
    '"Acme Corp"','"Développeur Front-End"','"CDI"','"Paris"','"hybride"',
    '"LinkedIn"','"https://example.com/offre"',`"${today()}"`,'""',
    '"à envoyer"','"haute"','"45k-55k"','"Sophie Martin"',
    '"s.martin@acme.com"','""','"React TypeScript, produit SaaS"'
  ].join(',');

  const blob = new Blob(['\uFEFF' + header + '\n' + example + '\n'],
    { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'),
    { href: url, download: 'modele_candidatures.csv' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Modèle CSV téléchargé ✓');
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  18. HELPERS MODAL
   ╚═══════════════════════════════════════════════════════════════════════ */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => {
    m.classList.remove('open');
  });
  document.body.style.overflow = '';
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  19. MOBILE SIDEBAR
   ╚═══════════════════════════════════════════════════════════════════════ */

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  20. THÈME
   ╚═══════════════════════════════════════════════════════════════════════ */

function toggleTheme() {
  const html = document.documentElement;
  const current = html.dataset.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  
  if (themeIcon) themeIcon.textContent = next === 'dark' ? '◑' : '☀';
  if (themeLabel) themeLabel.textContent = next === 'dark' ? 'Mode sombre' : 'Mode clair';
  
  try { localStorage.setItem('jt-theme', next); } catch {}
}

function initTheme() {
  let theme = 'dark';
  try { theme = localStorage.getItem('jt-theme') || 'dark'; } catch {}
  document.documentElement.dataset.theme = theme;
  
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  
  if (themeIcon) themeIcon.textContent = theme === 'dark' ? '◑' : '☀';
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Mode sombre' : 'Mode clair';
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  21. GREETING
   ╚═══════════════════════════════════════════════════════════════════════ */

function setGreeting() {
  const el = document.getElementById('greeting-date');
  if (!el) return;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  el.textContent = `${greet} · ${new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}`;
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  22. ÉVÉNEMENTS
   ╚═══════════════════════════════════════════════════════════════════════ */

function bindEvents() {
  /* ── Navigation — .nav-item[data-view] synchronise avec #view-<nom> ── */
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  /* "Tout voir" depuis dashboard */
  document.querySelectorAll('[data-view="list"]').forEach(btn => {
    btn.addEventListener('click', () => switchView('list'));
  });

  /* ── Mobile ── */
  const burger = document.getElementById('burger');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  if (burger) burger.addEventListener('click', openMobileSidebar);
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  /* ── Boutons ajout ── */
  const btnAddDesktop = document.getElementById('btn-add-desktop');
  const btnAddMobile = document.getElementById('btn-add-mobile');
  const btnAddList = document.getElementById('btn-add-list');
  
  if (btnAddDesktop) btnAddDesktop.addEventListener('click', openFormNew);
  if (btnAddMobile) btnAddMobile.addEventListener('click', openFormNew);
  if (btnAddList) btnAddList.addEventListener('click', openFormNew);

  /* ── Formulaire ── */
  const btnFormSave = document.getElementById('btn-form-save');
  const btnFormCancel = document.getElementById('btn-form-cancel');
  const modalFormClose = document.getElementById('modal-form-close');
  
  if (btnFormSave) btnFormSave.addEventListener('click', saveForm);
  if (btnFormCancel) btnFormCancel.addEventListener('click', () => closeModal('modal-form'));
  if (modalFormClose) modalFormClose.addEventListener('click', () => closeModal('modal-form'));

  /* ── Détail ── */
  const modalDetailClose = document.getElementById('modal-detail-close');
  const detailBtnEdit = document.getElementById('detail-btn-edit');
  const detailBtnDelete = document.getElementById('detail-btn-delete');
  
  if (modalDetailClose) modalDetailClose.addEventListener('click', () => closeModal('modal-detail'));
  if (detailBtnEdit) {
    detailBtnEdit.addEventListener('click', () => {
      if (State.detailId) openFormEdit(State.detailId);
    });
  }
  if (detailBtnDelete) {
    detailBtnDelete.addEventListener('click', () => {
      if (State.detailId) deleteCandidat(State.detailId);
    });
  }

  /* ── Import CSV ── */
  const openImport = () => {
    resetImportUI();
    State.pendingImport = [];
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
    openModal('modal-import');
  };
  
  const btnOpenImport = document.getElementById('btn-open-import');
  const btnOpenImport2 = document.getElementById('btn-open-import-2');
  const modalImportClose = document.getElementById('modal-import-close');
  const btnImportCancel = document.getElementById('btn-import-cancel');
  const btnImportConfirm = document.getElementById('btn-import-confirm');
  
  if (btnOpenImport) btnOpenImport.addEventListener('click', openImport);
  if (btnOpenImport2) btnOpenImport2.addEventListener('click', openImport);
  if (modalImportClose) modalImportClose.addEventListener('click', () => closeModal('modal-import'));
  if (btnImportCancel) btnImportCancel.addEventListener('click', () => closeModal('modal-import'));
  if (btnImportConfirm) btnImportConfirm.addEventListener('click', confirmImport);

  /* Drop zone */
  const dz = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  
  if (dz) {
    dz.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleCSVFile(e.dataTransfer.files[0]);
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) handleCSVFile(e.target.files[0]);
    });
  }

  /* Modèle CSV */
  const btnDownloadTemplate = document.getElementById('btn-download-template');
  const btnDownloadTemplate2 = document.getElementById('btn-download-template-2');
  
  if (btnDownloadTemplate) btnDownloadTemplate.addEventListener('click', downloadTemplate);
  if (btnDownloadTemplate2) btnDownloadTemplate2.addEventListener('click', downloadTemplate);

  /* ── Filtres ── */
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterContract = document.getElementById('filter-contract');
  const filterPriority = document.getElementById('filter-priority');
  const sortBy = document.getElementById('sort-by');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      State.filters.search = e.target.value;
      renderList();
    });
  }
  if (filterStatus) {
    filterStatus.addEventListener('change', e => {
      State.filters.status = e.target.value;
      renderList();
    });
  }
  if (filterContract) {
    filterContract.addEventListener('change', e => {
      State.filters.contract = e.target.value;
      renderList();
    });
  }
  if (filterPriority) {
    filterPriority.addEventListener('change', e => {
      State.filters.priority = e.target.value;
      renderList();
    });
  }
  if (sortBy) {
    sortBy.addEventListener('change', e => {
      State.filters.sort = e.target.value;
      renderList();
    });
  }
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      State.filters = { search:'', status:'', contract:'', priority:'', sort:'date_desc' };
      if (searchInput) searchInput.value = '';
      if (filterStatus) filterStatus.value = '';
      if (filterContract) filterContract.value = '';
      if (filterPriority) filterPriority.value = '';
      if (sortBy) sortBy.value = 'date_desc';
      renderList();
      toast('Filtres réinitialisés');
    });
  }

  /* ── Thème ── */
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleTheme);

  /* ── Overlay click → ferme modales ── */
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        closeAllModals();
        State.pendingImport = [];
      }
    });
  });

  /* ── ESC ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });
}

/* ╔═══════════════════════════════════════════════════════════════════════
   ║  23. INITIALISATION
   ╚═══════════════════════════════════════════════════════════════════════ */

async function init() {
  initTheme();
  setGreeting();
  await loadCandidaturesFromApi();
  bindEvents();
  switchView('dashboard');
  refreshAll();
}

// Vérifier si le DOM est déjà chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}