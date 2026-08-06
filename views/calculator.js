/**
 * Lab Revenue Calculator — Prime AD Solutions Campaign Landing View
 *
 * Provides real-time Medicare reimbursement projections for lab lead gen campaigns:
 * - 4 Featured Campaign Lines (PGx, UTI, Immunodeficiency, CGx)
 * - Custom Test Code Search & Builder (add/remove any code from 2,081 CLFS dataset)
 * - Lead Campaign Volume Tiers (Starter, Growth, Scale) + Custom Volume Slider
 * - Real-time Monthly & Annual Revenue math
 * - Pitch Summary text copy & Proposal CSV export
 *
 * @param {HTMLElement} container
 * @param {import('../types').CLFSRecord[]} allRecords
 */
export function renderCalculator(container, allRecords) {
  const byCode = new Map(allRecords.map(r => [r.hcpcs, r]));

  // ── Default Campaign Definitions ───────────────────────────────────────
  const CAMPAIGNS = {
    pgx: {
      id: 'pgx',
      icon: '🧬',
      color: '#bc8cff',
      colorDim: 'rgba(188,140,255,0.15)',
      name: 'Pharmacogenomics (PGx)',
      tagline: 'Multi-Gene Drug Metabolism Testing',
      description: 'DNA analysis to determine medication processing (pain, psych, cardiology). High reimbursement.',
      codes: ['81225', '81226', '81227', '81355', 'G9143', '0032U', '0034U'],
      codeLabels: {
        '81225': 'CYP2C19 Gene Analysis',
        '81226': 'CYP2D6 Gene Analysis',
        '81227': 'CYP2C9 Gene Analysis',
        '81355': 'VKORC1 Gene Analysis',
        'G9143': 'Warfarin Responsive Genetic Test',
        '0032U': 'COMT Gene Analysis',
        '0034U': 'TPMT / NUDT15 Gene Analysis',
      },
      tiers: {
        starter: { label: 'Starter', budget: 10000, volume: 32 },
        growth:  { label: 'Growth',  budget: 25000, volume: 80 },
        scale:   { label: 'Scale',   budget: 50000, volume: 165 },
      },
    },
    uti: {
      id: 'uti',
      icon: '🧫',
      color: '#00d4aa',
      colorDim: 'rgba(0,212,170,0.15)',
      name: 'UTI Pathogen Panel',
      tagline: 'Molecular PCR Infection Testing',
      description: 'PCR identification of pathogens & resistance markers from urine. High demand.',
      codes: ['87481', '87640', '87798', '87799', '87153', '87810', '87900', '87801'],
      codeLabels: {
        '87481': 'Candida Species — DNA Probe',
        '87640': 'Staph aureus — DNA Probe',
        '87798': 'Pathogen Detection — DNA Amplified',
        '87799': 'Pathogen Detection — DNA Quantified',
        '87153': 'Multi-Organism DNA/RNA Sequencing',
        '87810': 'Chlamydia trachomatis Assay',
        '87900': 'Antibiotic Resistance Phenotype',
        '87801': 'Multi-Agent Detection — DNA Amplified',
      },
      tiers: {
        starter: { label: 'Starter', budget: 10000, volume: 66 },
        growth:  { label: 'Growth',  budget: 25000, volume: 170 },
        scale:   { label: 'Scale',   budget: 50000, volume: 355 },
      },
    },
    immune: {
      id: 'immune',
      icon: '🛡️',
      color: '#ffa657',
      colorDim: 'rgba(255,166,87,0.15)',
      name: 'Immunodeficiency (NGS)',
      tagline: 'Next-Gen Sequencing Immune Panels',
      description: 'Large NGS gene panels for primary immunodeficiency. Premium per-patient Medicare rates.',
      codes: ['81408', '81407', '81406', '81405', '81404'],
      codeLabels: {
        '81408': 'Molecular Pathology Tier 9 (NGS Full Sequence)',
        '81407': 'Molecular Pathology Tier 8',
        '81406': 'Molecular Pathology Tier 7',
        '81405': 'Molecular Pathology Tier 6',
        '81404': 'Molecular Pathology Tier 5',
      },
      tiers: {
        starter: { label: 'Starter', budget: 10000, volume: 9 },
        growth:  { label: 'Growth',  budget: 25000, volume: 22 },
        scale:   { label: 'Scale',   budget: 50000, volume: 46 },
      },
    },
    cgx: {
      id: 'cgx',
      icon: '🔬',
      color: '#58a6ff',
      colorDim: 'rgba(88,166,255,0.15)',
      name: 'CGx — Cancer Genomics',
      tagline: 'Hereditary Cancer Risk Testing',
      description: 'Hereditary cancer risk panels (BRCA1/2, Lynch Syndrome, APC gene). High clinical value.',
      codes: ['81432', '81435', '81201', '81203', '81215'],
      codeLabels: {
        '81432': 'Hereditary Breast Cancer Panel (5+ genes)',
        '81435': 'Hereditary Colon Cancer Panel (5+ genes)',
        '81201': 'APC Gene — Full Sequence',
        '81203': 'APC Gene — Duplication / Deletion',
        '81215': 'BRCA1 Gene — Known Familial Variant',
      },
      tiers: {
        starter: { label: 'Starter', budget: 10000, volume: 8 },
        growth:  { label: 'Growth',  budget: 25000, volume: 20 },
        scale:   { label: 'Scale',   budget: 50000, volume: 40 },
      },
    },
  };

  // ── State ──────────────────────────────────────────────────────────────
  const state = {
    campaignId: 'pgx',
    tier: 'starter',
    customVolume: null,
    // Dynamic panel codes per campaign (copy of defaults, modified if user adds/removes)
    activeCodes: [...CAMPAIGNS.pgx.codes],
  };

  /** Helper to format currency */
  const fmt$ = n => (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  /** Get active volume */
  function getVolume() {
    if (state.customVolume !== null) return state.customVolume;
    const camp = CAMPAIGNS[state.campaignId];
    return camp ? (camp.tiers[state.tier]?.volume ?? 50) : 50;
  }

  // ── Render Shell ───────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="view-header calc-header">
      <div>
        <h1>Lab Revenue Calculator</h1>
        <p>Select a campaign line or build a custom test panel to model monthly & annual Medicare lab revenue.</p>
      </div>
      <div class="clfs-vintage-tag">CMS CY2026 CLFS — Medicare Rates</div>
    </div>

    <div class="view-body calc-body-scroll">
      <!-- Campaign Selection Cards -->
      <div class="campaign-grid" id="campaign-grid"></div>

      <!-- Engine Split -->
      <div class="calc-engine">
        <div class="calc-left">
          <!-- Lead Tier Controls -->
          <div class="tier-section">
            <div class="tier-section-label">Lead Campaign Tier & Patient Volume</div>
            <div class="tier-buttons" id="tier-buttons"></div>
            <div class="custom-tier-wrap">
              <div class="custom-tier-label">
                <span>Custom Volume</span>
                <span class="custom-vol-display" id="custom-vol-display">50 patients/mo</span>
              </div>
              <input type="range" class="vol-slider" id="vol-slider" min="1" max="1000" value="32" />
            </div>
          </div>

          <!-- Test Panel Breakdown -->
          <div class="panel-breakdown">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
              <div class="panel-breakdown-label" style="margin:0;">Test Panel Breakdown</div>
              <button class="btn btn-sm" id="reset-panel-btn" style="font-size:11px; padding:3px 8px;">Reset Default Panel</button>
            </div>

            <!-- Add Custom Code Search -->
            <div style="position:relative; margin-bottom:14px;">
              <div style="display:flex; gap:8px;">
                <input type="text" id="add-code-input" placeholder="Search HCPCS code or test name to add (e.g. 80047, 81225)…"
                  style="flex:1; padding:8px 12px; border-radius:6px; border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-family:inherit; font-size:13px;" autocomplete="off" />
              </div>
              <div id="add-code-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; z-index:100; box-shadow:0 4px 16px rgba(0,0,0,0.3); margin-top:4px;"></div>
            </div>

            <div class="panel-table-wrap">
              <table class="panel-table">
                <thead>
                  <tr>
                    <th>HCPCS Code</th>
                    <th>Test Description</th>
                    <th>Medicare Pays</th>
                    <th style="width:40px; text-align:center;">Action</th>
                  </tr>
                </thead>
                <tbody id="panel-tbody"></tbody>
              </table>
            </div>

            <div class="rate-disclaimer">
              ⚠ Medicare reimbursement amounts are CY2026 CLFS national rates. Actual lab revenue varies based on billing compliance, Medicare vs. commercial payer mix, and patient eligibility.
            </div>
          </div>
        </div>

        <div class="calc-right">
          <div class="revenue-summary-card">
            <div class="rev-campaign-name" id="rev-campaign-name"></div>
            <div class="rev-volume-label" id="rev-volume-label"></div>

            <div class="rev-stats">
              <div class="rev-stat">
                <div class="rev-stat-label">Per Patient Value</div>
                <div class="rev-stat-value" id="per-patient-val">$0.00</div>
              </div>
              <div class="rev-stat highlight">
                <div class="rev-stat-label">Monthly Lab Revenue</div>
                <div class="rev-stat-value large" id="monthly-val">$0.00</div>
                <div class="rev-stat-sub">per month</div>
              </div>
              <div class="rev-stat">
                <div class="rev-stat-label">Annual Lab Revenue</div>
                <div class="rev-stat-value" id="annual-val">$0.00</div>
                <div class="rev-stat-sub">per year</div>
              </div>
            </div>

            <div class="proposal-actions">
              <button class="btn btn-accent" id="copy-btn">📋 Copy Pitch Summary</button>
              <button class="btn" id="export-csv-btn">⬇ Export Proposal CSV</button>
            </div>

            <div class="copy-toast" id="copy-toast">✓ Copied to clipboard!</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Campaign Cards Construction ────────────────────────────────────────
  const grid = container.querySelector('#campaign-grid');
  Object.values(CAMPAIGNS).forEach(camp => {
    const card = document.createElement('div');
    card.className = `campaign-card${camp.id === state.campaignId ? ' active' : ''}`;
    card.dataset.campaign = camp.id;
    card.style.setProperty('--camp-color', camp.color);
    card.style.setProperty('--camp-dim', camp.colorDim);
    card.innerHTML = `
      <div class="camp-icon">${camp.icon}</div>
      <div class="camp-name">${camp.name}</div>
      <div class="camp-tag">${camp.tagline}</div>
      <div class="camp-desc">${camp.description}</div>
    `;
    card.addEventListener('click', () => {
      state.campaignId = camp.id;
      state.tier = 'starter';
      state.customVolume = null;
      state.activeCodes = [...camp.codes];
      renderAll();
    });
    grid.appendChild(card);
  });

  // ── Slider Listener ────────────────────────────────────────────────────
  const slider = container.querySelector('#vol-slider');
  slider.addEventListener('input', () => {
    state.customVolume = parseInt(slider.value, 10);
    state.tier = null;
    renderAll();
  });

  // ── Search & Add Custom Code Listener ──────────────────────────────────
  const addInput = container.querySelector('#add-code-input');
  const addDropdown = container.querySelector('#add-code-dropdown');

  addInput.addEventListener('input', () => {
    const q = addInput.value.trim().toLowerCase();
    if (!q) {
      addDropdown.style.display = 'none';
      return;
    }

    const matches = allRecords.filter(r =>
      r.hcpcs.toLowerCase().startsWith(q) ||
      r.short_desc?.toLowerCase().includes(q)
    ).slice(0, 10);

    if (matches.length === 0) {
      addDropdown.innerHTML = `<div style="padding:10px; font-size:12px; color:var(--text-muted);">No matching codes found</div>`;
    } else {
      addDropdown.innerHTML = matches.map(r => `
        <div class="add-code-item" data-code="${r.hcpcs}" style="padding:8px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:var(--accent); font-family:monospace;">${r.hcpcs}</strong> — ${r.short_desc || ''}
          </div>
          <span style="font-weight:600; color:var(--text-primary); font-variant-numeric:tabular-nums;">
            ${r.is_locally_priced ? 'Local' : `$${(r.rate_2026 ?? 0).toFixed(2)}`}
          </span>
        </div>
      `).join('');
    }

    addDropdown.style.display = 'block';
  });

  addDropdown.addEventListener('click', e => {
    const item = e.target.closest('.add-code-item');
    if (!item) return;
    const code = item.dataset.code;
    if (!state.activeCodes.includes(code)) {
      state.activeCodes.push(code);
    }
    addInput.value = '';
    addDropdown.style.display = 'none';
    renderAll();
  });

  document.addEventListener('click', e => {
    if (!addInput.contains(e.target) && !addDropdown.contains(e.target)) {
      addDropdown.style.display = 'none';
    }
  });

  // Reset panel button
  container.querySelector('#reset-panel-btn').addEventListener('click', () => {
    const camp = CAMPAIGNS[state.campaignId];
    if (camp) {
      state.activeCodes = [...camp.codes];
      renderAll();
    }
  });

  // Wire Copy & Export
  container.querySelector('#copy-btn').addEventListener('click', () => {
    const text = buildPitchText();
    navigator.clipboard.writeText(text).then(() => {
      const toast = container.querySelector('#copy-toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    });
  });

  container.querySelector('#export-csv-btn').addEventListener('click', () => {
    exportProposalCSV();
  });

  // ── Render Engine ──────────────────────────────────────────────────────
  function renderAll() {
    const camp = CAMPAIGNS[state.campaignId];

    // Highlight active campaign card
    container.querySelectorAll('.campaign-card').forEach(el => {
      el.classList.toggle('active', el.dataset.campaign === state.campaignId);
    });

    // Render Tier Buttons
    const tierContainer = container.querySelector('#tier-buttons');
    tierContainer.innerHTML = '';
    Object.entries(camp.tiers).forEach(([key, tier]) => {
      const btn = document.createElement('button');
      btn.className = `tier-btn${state.tier === key ? ' active' : ''}`;
      btn.style.setProperty('--camp-color', camp.color);
      btn.innerHTML = `
        <div class="tier-btn-name">${tier.label}</div>
        <div class="tier-btn-budget">~${fmt$(tier.budget).replace('.00', '')}/mo budget</div>
        <div class="tier-btn-vol">${tier.volume.toLocaleString()} pts/mo</div>
      `;
      btn.addEventListener('click', () => {
        state.tier = key;
        state.customVolume = null;
        slider.value = tier.volume;
        renderAll();
      });
      tierContainer.appendChild(btn);
    });

    // Update Volume Slider display
    const currentVol = getVolume();
    slider.value = currentVol;
    container.querySelector('#custom-vol-display').textContent = `${currentVol.toLocaleString()} patients/mo`;

    // Render Panel Table
    const tbody = container.querySelector('#panel-tbody');
    tbody.innerHTML = '';

    let totalPerPatient = 0;

    state.activeCodes.forEach(code => {
      const rec = byCode.get(code);
      const label = camp.codeLabels[code] ?? rec?.short_desc ?? code;
      const isLoc = rec?.is_locally_priced ?? false;
      const rate = rec && !isLoc ? (rec.rate_2026 ?? 0) : 0;
      totalPerPatient += rate;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-weight:700; color:var(--camp-color, var(--accent))">${code}</td>
        <td style="color:var(--text-secondary); font-size:12px">${label}</td>
        <td style="font-weight:600; font-variant-numeric:tabular-nums; color:var(--text-primary)">
          ${rec ? (isLoc ? '<span class="badge badge-purple">Local Rate</span>' : fmt$(rate)) : '<span style="color:var(--text-muted)">N/A</span>'}
        </td>
        <td style="text-align:center;">
          <button class="remove-code-btn" data-code="${code}" title="Remove code from panel"
            style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:2px 6px;">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Wire remove code buttons
    tbody.querySelectorAll('.remove-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.dataset.code;
        state.activeCodes = state.activeCodes.filter(x => x !== c);
        renderAll();
      });
    });

    // Total Row
    const totalRow = document.createElement('tr');
    totalRow.style.borderTop = '2px solid var(--border)';
    totalRow.innerHTML = `
      <td colspan="2" style="font-weight:700; font-size:13px; padding-top:10px">Total Per Patient</td>
      <td style="font-weight:800; font-size:15px; color:var(--accent); font-variant-numeric:tabular-nums; padding-top:10px">${fmt$(totalPerPatient)}</td>
      <td></td>
    `;
    tbody.appendChild(totalRow);

    // Revenue Summary Card Updates
    const monthly = totalPerPatient * currentVol;
    const annual = monthly * 12;

    container.querySelector('#rev-campaign-name').innerHTML = `${camp.icon} ${camp.name}`;
    container.querySelector('#rev-campaign-name').style.color = camp.color;
    container.querySelector('#rev-volume-label').textContent = `${currentVol.toLocaleString()} patients/month`;
    container.querySelector('#per-patient-val').textContent = fmt$(totalPerPatient);
    container.querySelector('#monthly-val').textContent = fmt$(monthly);
    container.querySelector('#annual-val').textContent = fmt$(annual);
  }

  // ── Build Text Proposal ────────────────────────────────────────────────
  function buildPitchText() {
    const camp = CAMPAIGNS[state.campaignId];
    const volume = getVolume();
    let totalPerPatient = 0;
    const items = state.activeCodes.map(code => {
      const rec = byCode.get(code);
      const label = camp.codeLabels[code] ?? rec?.short_desc ?? code;
      const rate = rec && !rec.is_locally_priced ? (rec.rate_2026 ?? 0) : 0;
      totalPerPatient += rate;
      return `  • ${label} (${code}): ${rec && !rec.is_locally_priced ? fmt$(rate) : 'Local'}`;
    });

    const monthly = totalPerPatient * volume;
    const annual = monthly * 12;
    const tierLabel = state.tier ? `${camp.tiers[state.tier].label} Tier` : 'Custom Volume';

    return [
      `PRIME AD SOLUTIONS — LAB REIMBURSEMENT PROPOSAL`,
      `====================================================`,
      `Campaign Line : ${camp.name}`,
      `Lead Tier     : ${tierLabel}`,
      `Monthly Volume: ${volume.toLocaleString()} patients / month`,
      ``,
      `MEDICARE REIMBURSEMENT PROJECTIONS (CY2026 CLFS):`,
      `  Per-Patient Reimbursement  : ${fmt$(totalPerPatient)}`,
      `  Estimated Monthly Revenue  : ${fmt$(monthly)} / mo`,
      `  Estimated Annual Revenue   : ${fmt$(annual)} / yr`,
      ``,
      `TEST PANEL BREAKDOWN:`,
      ...items,
      ``,
      `----------------------------------------------------`,
      `Rates derived from CMS CY2026 Clinical Laboratory Fee Schedule.`,
      `Generated by Prime AD Solutions Lab Revenue Estimator`,
      `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    ].join('\n');
  }

  // ── Export CSV Proposal ────────────────────────────────────────────────
  function exportProposalCSV() {
    const camp = CAMPAIGNS[state.campaignId];
    const volume = getVolume();
    let totalPerPatient = 0;
    const rows = [
      ['Prime AD Solutions — Lab Revenue Proposal'],
      ['Campaign', camp.name],
      ['Lead Volume (patients/mo)', volume],
      [],
      ['HCPCS Code', 'Test Description', 'Medicare Reimbursement Rate (CY2026)'],
    ];

    state.activeCodes.forEach(code => {
      const rec = byCode.get(code);
      const label = camp.codeLabels[code] ?? rec?.short_desc ?? code;
      const rate = rec && !rec.is_locally_priced ? (rec.rate_2026 ?? 0) : 0;
      totalPerPatient += rate;
      rows.push([code, label, rec && !rec.is_locally_priced ? rate.toFixed(2) : 'Local']);
    });

    const monthly = totalPerPatient * volume;
    const annual = monthly * 12;

    rows.push([]);
    rows.push(['Total Per Patient Reimbursement', totalPerPatient.toFixed(2)]);
    rows.push(['Estimated Monthly Revenue', monthly.toFixed(2)]);
    rows.push(['Estimated Annual Revenue', annual.toFixed(2)]);
    rows.push([]);
    rows.push(['Source', 'CMS CY2026 CLFS']);
    rows.push(['Date', new Date().toLocaleDateString()]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primeAD_${camp.id}_lab_proposal.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Initial Render ─────────────────────────────────────────────────────
  renderAll();
}
