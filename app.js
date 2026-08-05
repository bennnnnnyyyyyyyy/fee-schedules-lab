/** @type {import('./types').CLFSRecord[]} */
let ALL_RECORDS = [];

/** @type {{ query: string, filter: string, sortCol: string, sortDir: 1|-1 }} */
const state = {
  query: '',
  filter: 'all',
  sortCol: 'hcpcs',
  sortDir: 1,
};

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadData() {
  const res = await fetch('./data/clfs.json');
  if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Filter + search
// ---------------------------------------------------------------------------
/**
 * @param {import('./types').CLFSRecord[]} records
 * @param {string} query
 * @param {string} filter
 * @returns {import('./types').CLFSRecord[]}
 */
export function applyFilters(records, query, filter) {
  const q = query.trim().toLowerCase();
  return records.filter(r => {
    // Search: HCPCS prefix OR any description tier substring
    if (q) {
      const codeMatch = r.hcpcs.toLowerCase().startsWith(q);
      const descMatch = (
        r.short_desc?.toLowerCase().includes(q) ||
        r.long_desc?.toLowerCase().includes(q) ||
        r.extended_desc?.toLowerCase().includes(q)
      );
      if (!codeMatch && !descMatch) return false;
    }

    // Filter chips
    switch (filter) {
      case 'national':  return !r.is_locally_priced;
      case 'local':     return r.is_locally_priced;
      case 'clia':      return r.has_qw_variant;
      case 'pama':      return r.in_pama_scope;
      case 'all':
      default:          return true;
    }
  });
}

/**
 * @param {import('./types').CLFSRecord[]} records
 * @param {string} col
 * @param {1|-1} dir
 */
export function applySort(records, col, dir) {
  return [...records].sort((a, b) => {
    let av = a[col] ?? '';
    let bv = b[col] ?? '';
    if (col === 'rate_2026') {
      av = av ?? -1;
      bv = bv ?? -1;
    }
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// View router
// ---------------------------------------------------------------------------
let currentView = null;

/** @param {'browse'|'analytics'|'detail'} view @param {*} [payload] */
async function navigate(view, payload = null) {
  currentView = view;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  const main = document.getElementById('view-container');
  main.innerHTML = '';

  if (view === 'browse') {
    const { renderBrowse } = await import('./views/browse.js');
    renderBrowse(main, ALL_RECORDS, state, navigate);
  } else if (view === 'analytics') {
    const { renderAnalytics } = await import('./views/analytics.js');
    renderAnalytics(main, ALL_RECORDS);
  } else if (view === 'detail') {
    const { renderDetail } = await import('./views/detail.js');
    renderDetail(main, payload, () => navigate('browse'));
  }
}

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------
function initTheme() {
  const stored = localStorage.getItem('clfs-theme') ?? 'dark';
  document.documentElement.dataset.theme = stored;
  updateThemeBtn(stored);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme ?? 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('clfs-theme', next);
  updateThemeBtn(next);
}

/** @param {string} theme */
function updateThemeBtn(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<span>☀️</span><span>Light mode</span>'
    : '<span>🌙</span><span>Dark mode</span>';
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  initTheme();

  // Wire nav
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.view));
  });

  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  try {
    ALL_RECORDS = await loadData();
    document.getElementById('loading-overlay').classList.add('hidden');
    navigate('browse');
  } catch (err) {
    const overlay = document.getElementById('loading-overlay');
    overlay.innerHTML = `
      <div style="color:#f85149;font-size:14px;text-align:center;max-width:360px;padding:24px">
        <div style="font-size:32px;margin-bottom:12px">⚠️</div>
        <strong>Could not load data</strong>
        <p style="margin-top:8px;color:#8b949e">
          Run <code style="background:#161b22;padding:2px 6px;border-radius:4px">python ingest.py</code>
          to generate <code>data/clfs.json</code>, then reload this page.
        </p>
        <p style="margin-top:8px;color:#8b949e;font-size:12px">${err.message}</p>
      </div>`;
  }
}

boot();
