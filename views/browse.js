import { applyFilters, applySort } from '../app.js';

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------
/** @param {import('../types').CLFSRecord[]} records */
function exportCSV(records) {
  const headers = ['HCPCS', 'Short Description', 'CY2026 Rate', 'Indicator', 'Modifier', 'PAMA Scope', 'ADLT', 'CLIA Waived', 'Eff Date'];
  const rows = records.map(r => [
    r.hcpcs,
    `"${(r.short_desc ?? '').replace(/"/g, '""')}"`,
    r.is_locally_priced ? 'Locally determined' : (r.rate_2026?.toFixed(2) ?? ''),
    r.is_locally_priced ? 'Local' : 'National',
    r.modifier || '',
    r.in_pama_scope ? 'Yes' : 'No',
    r.is_adlt ? 'Yes' : 'No',
    r.has_qw_variant ? 'Yes' : 'No',
    r.eff_date ?? '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clfs_cy2026_export.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
/** @param {import('../types').CLFSRecord} r */
function formatRate(r) {
  if (r.is_locally_priced) return '<span class="badge badge-muted">Locally determined</span>';
  if (r.rate_2026 == null) return '—';
  return `$${r.rate_2026.toFixed(2)}`;
}

/** @param {import('../types').CLFSRecord} r */
function buildBadges(r) {
  const parts = [];
  if (r.is_locally_priced)  parts.push('<span class="badge badge-purple">Local</span>');
  if (r.in_pama_scope)       parts.push('<span class="badge badge-green">PAMA</span>');
  if (r.has_qw_variant)      parts.push('<span class="badge badge-blue">CLIA Waived</span>');
  if (r.is_adlt)             parts.push('<span class="badge badge-orange">ADLT</span>');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: 'hcpcs',      label: 'Code',            sortable: true },
  { key: 'short_desc', label: 'Description',      sortable: true },
  { key: 'rate_2026',  label: 'CY2026 Rate',      sortable: true },
  { key: 'indicator',  label: 'Status',           sortable: false },
  { key: 'in_pama_scope', label: 'PAMA Scope',   sortable: true },
];

/**
 * @param {HTMLElement} container
 * @param {import('../types').CLFSRecord[]} allRecords
 * @param {{ query: string, filter: string, sortCol: string, sortDir: 1|-1 }} state
 * @param {Function} navigate
 */
export function renderBrowse(container, allRecords, state, navigate) {
  container.innerHTML = `
    <div class="view-header">
      <h1>Browse Fee Schedule</h1>
      <p>CY2026 Clinical Laboratory Fee Schedule — ${allRecords.length.toLocaleString()} codes</p>
    </div>
    <div class="view-body">
      <div class="controls-bar">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="search-input"
            placeholder="Search by code or description…"
            value="${state.query}"
            autocomplete="off"
          />
        </div>
        <div class="filter-chips" id="filter-chips">
          <button class="chip ${state.filter === 'all'     ? 'active' : ''}" data-filter="all">All</button>
          <button class="chip ${state.filter === 'national'? 'active' : ''}" data-filter="national">Nationally Priced</button>
          <button class="chip ${state.filter === 'local'   ? 'active' : ''}" data-filter="local">Locally Priced</button>
          <button class="chip ${state.filter === 'clia'    ? 'active' : ''}" data-filter="clia">CLIA Waived</button>
          <button class="chip ${state.filter === 'pama'    ? 'active' : ''}" data-filter="pama">PAMA In-Scope</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="results-meta" id="results-meta"></div>
        <button class="btn" id="export-btn">⬇ Export CSV</button>
      </div>

      <div class="table-wrap">
        <table id="main-table">
          <thead>
            <tr id="thead-row"></tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
        <div id="empty-state" class="empty-state" style="display:none">
          <span class="empty-icon">🔬</span>
          <p>No codes match your search.</p>
        </div>
      </div>
    </div>
  `;

  // Build header
  const theadRow = container.querySelector('#thead-row');
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.dataset.col = col.key;
    const isSorted = state.sortCol === col.key;
    if (isSorted) th.classList.add('sorted');
    th.innerHTML = `${col.label}${col.sortable ? ` <span class="sort-icon">${isSorted ? (state.sortDir === 1 ? '▲' : '▼') : '⇅'}</span>` : ''}`;
    if (col.sortable) {
      th.addEventListener('click', () => {
        if (state.sortCol === col.key) {
          state.sortDir = /** @type {1|-1} */ (state.sortDir * -1);
        } else {
          state.sortCol = col.key;
          state.sortDir = 1;
        }
        refresh();
      });
    }
    theadRow.appendChild(th);
  });

  // Search input
  let debounceTimer = null;
  container.querySelector('#search-input').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.query = e.target.value;
      refresh();
    }, 150);
  });

  // Filter chips
  container.querySelector('#filter-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    container.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    refresh();
  });

  // Export
  container.querySelector('#export-btn').addEventListener('click', () => {
    const filtered = applyFilters(allRecords, state.query, state.filter);
    const sorted = applySort(filtered, state.sortCol, state.sortDir);
    exportCSV(sorted);
  });

  // Initial render
  refresh();

  function refresh() {
    const filtered = applyFilters(allRecords, state.query, state.filter);
    const sorted = applySort(filtered, state.sortCol, state.sortDir);

    // Update sort icons
    container.querySelectorAll('th[data-col]').forEach(th => {
      const isSorted = th.dataset.col === state.sortCol;
      th.classList.toggle('sorted', isSorted);
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = isSorted ? (state.sortDir === 1 ? '▲' : '▼') : '⇅';
    });

    // Results meta
    container.querySelector('#results-meta').textContent =
      `${sorted.length.toLocaleString()} result${sorted.length !== 1 ? 's' : ''}${state.query ? ` for "${state.query}"` : ''}`;

    // Render rows
    const tbody = container.querySelector('#tbody');
    const empty = container.querySelector('#empty-state');

    if (sorted.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';

    // Batch-render using DocumentFragment for performance
    const frag = document.createDocumentFragment();
    sorted.forEach(record => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="code-cell">${record.hcpcs}</td>
        <td class="desc-cell" title="${(record.short_desc ?? '').replace(/"/g, '&quot;')}">${record.short_desc ?? '—'}</td>
        <td class="rate-cell">${formatRate(record)}</td>
        <td>${buildBadges(record)}</td>
        <td>${record.in_pama_scope ? '<span class="badge badge-green">✓ In Scope</span>' : '<span class="badge badge-muted">Not in scope</span>'}</td>
      `;
      tr.addEventListener('click', () => navigate('detail', record));
      frag.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(frag);
  }
}
