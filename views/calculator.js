/**
 * Lab Revenue Calculator — Prime AD Solutions Campaign Landing View
 *
 * The main landing page. Shows 4 campaign lines (PGx, UTI, Immunodeficiency, CGx),
 * lets users select Prime AD lead volume tiers, and computes projected Medicare
 * reimbursement revenue (monthly & annual) in real time.
 *
 * @param {HTMLElement} container
 * @param {import('../types').CLFSRecord[]} allRecords
 */
export function renderCalculator(container, allRecords) {
  // Build a quick lookup map from the loaded data
  const byCode = new Map(allRecords.map(r => [r.hcpcs, r]));

  // ── Campaign definitions ────────────────────────────────────────────────
  // Each panel = the typical test menu billed per patient in that campaign line.
  // Rates are sourced live from data/clfs.json (CY2026 CLFS).
  const CAMPAIGNS = {
    pgx: {
      id: 'pgx',
      icon: '🧬',
      color: '#bc8cff',
      colorDim: 'rgba(188,140,255,0.12)',
      name: 'Pharmacogenomics (PGx)',
      tagline: 'Multi-Gene Drug Metabolism Testing',
      description: 'DNA analysis to determine how patients process medications — pain management, psychiatry, cardiology. High reimbursement, repeat business.',
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
      colorDim: 'rgba(0,212,170,0.12)',
      name: 'UTI Pathogen Panel',
      tagline: 'Molecular PCR Infection Testing',
      description: 'Next-gen molecular PCR panels identify pathogens and antibiotic resistance from urine samples. High physician demand, Medicare-covered.',
      codes: ['87481', '87640', '87798', '87799', '87153', '87810', '87900', '87801'],
      codeLabels: {
        '87481': 'Candida Species — DNA Amplified Probe',
        '87640': 'Staphylococcus aureus — DNA Amplified Probe',
        '87798': 'Pathogen Detection — DNA Amplified',
        '87799': 'Pathogen Detection — DNA Quantified',
        '87153': 'Multi-Organism DNA / RNA Sequencing',
        '87810': 'Chlamydia trachomatis — Optical Assay',
        '87900': 'Antibiotic Resistance Phenotype Analysis',
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
      colorDim: 'rgba(255,166,87,0.12)',
      name: 'Immunodeficiency (NGS)',
      tagline: 'Next-Gen Sequencing Immune Panels',
      description: 'Large NGS gene panels for primary and acquired immunodeficiency disorders. Highest per-patient Medicare reimbursement of all campaign lines.',
      codes: ['81408', '81407', '81406', '81405', '81404'],
      codeLabels: {
        '81408': 'Molecular Pathology — Tier 9 (NGS Full Gene Sequence)',
        '81407': 'Molecular Pathology — Tier 8',
        '81406': 'Molecular Pathology — Tier 7',
        '81405': 'Molecular Pathology — Tier 6',
        '81404': 'Molecular Pathology — Tier 5',
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
      colorDim: 'rgba(88,166,255,0.12)',
      name: 'CGx — Cancer Genomics',
      tagline: 'Hereditary Cancer Risk Testing',
      description: 'Hereditary cancer panels (BRCA1/2, Lynch Syndrome, APC gene) for high-risk patients. Premium reimbursement, growing oncology demand.',
      codes: ['81432', '81435', '81201', '81203', '81215'],
      codeLabels: {
        '81432': 'Hereditary Breast Cancer Panel (5+ genes)',
        '81435': 'Hereditary Colon Cancer Panel (5+ genes)',
        '81201': 'APC Gene — Full Sequence Analysis',
        '81203': 'APC Gene — Duplication / Deletion Variants',
        '81215': 'BRCA1 Gene — Known Familial Variant',
      },
      tiers: {
        starter: { label: 'Starter', budget: 10000, volume: 8 },
        growth:  { label: 'Growth',  budget: 25000, volume: 20 },
        scale:   { label: 'Scale',   budget: 50000, volume: 40 },
      },
    },
  };

  // ── View state ──────────────────────────────────────────────────────────
  const state = {
    campaignId: 'pgx',
    tier: 'starter',
    customVolume: null, // null = using preset tier
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  /** @param {number} n */
  const fmt$ = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  /** Resolve codes that exist in the CLFS and are nationally priced */
  function resolvePanel(campaign) {
    return campaign.codes.map(code => {
      const rec = byCode.get(code);
      return {
        code,
        label: campaign.codeLabels[code] ?? rec?.short_desc ?? code,
        rate: rec && !rec.is_locally_priced ? rec.rate_2026 : null,
        available: !!rec && !rec.is_locally_priced,
      };
    });
  }

  function getVolume() {
    if (state.customVolume !== null) return state.customVolume;
    const camp = CAMPAIGNS[state.campaignId];
    return camp.tiers[state.tier]?.volume ?? 0;
  }

  // ── Initial HTML ─────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="view-header calc-header">
      <div>
        <h1>Lab Revenue Calculator</h1>
        <p>Select your campaign line to project Medicare reimbursement revenue for your lab.</p>
      </div>
      <div class="clfs-vintage-tag">CMS CY2026 CLFS — Actual Medicare Rates</div>
    </div>

    <div class="view-body calc-body-scroll">

      <!-- Campaign Selector Cards -->
      <div class="campaign-grid" id="campaign-grid"></div>

      <!-- Revenue Engine -->
      <div class="calc-engine" id="calc-engine">
        <div class="calc-left">
          <div class="tier-section">
            <div class="tier-section-label">Lead Campaign Tier</div>
            <div class="tier-buttons" id="tier-buttons"></div>
            <div class="custom-tier-wrap">
              <div class="custom-tier-label">
                <span>Custom Volume</span>
                <span class="custom-vol-display" id="custom-vol-display"></span>
              </div>
              <input type="range" class="vol-slider" id="vol-slider" min="1" max="1000" />
            </div>
          </div>

          <div class="panel-breakdown">
            <div class="panel-breakdown-label">Test Panel Breakdown</div>
            <div class="panel-table-wrap">
              <table class="panel-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Test</th>
                    <th>Medicare Pays</th>
                  </tr>
                </thead>
                <tbody id="panel-tbody"></tbody>
              </table>
            </div>
            <div class="rate-disclaimer">
              ⚠ Rates are CY2026 Medicare CLFS national prices. Actual reimbursement depends on payer mix, patient eligibility, deductibles, and billing compliance.
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
                <div class="rev-stat-value" id="per-patient-val">—</div>
              </div>
              <div class="rev-stat highlight">
                <div class="rev-stat-label">Monthly Lab Revenue</div>
                <div class="rev-stat-value large" id="monthly-val">—</div>
                <div class="rev-stat-sub">per month</div>
              </div>
              <div class="rev-stat">
                <div class="rev-stat-label">Annual Lab Revenue</div>
                <div class="rev-stat-value" id="annual-val">—</div>
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

  // ── Build campaign cards ─────────────────────────────────────────────────
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
      render();
    });
    grid.appendChild(card);
  });

  // ── Wire slider ──────────────────────────────────────────────────────────
  const slider = container.querySelector('#vol-slider');
  slider.addEventListener('input', () => {
    state.customVolume = parseInt(slider.value, 10);
    state.tier = null;
    render();
  });

  // ── Wire copy & export ───────────────────────────────────────────────────
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

  // ── Main render ──────────────────────────────────────────────────────────
  function render() {
    const camp = CAMPAIGNS[state.campaignId];
    const panel = resolvePanel(camp);
    const perPatient = panel.reduce((sum, row) => sum + (row.rate ?? 0), 0);
    const volume = getVolume();
    const monthly = perPatient * volume;
    const annual = monthly * 12;

    // Campaign cards — active state
    container.querySelectorAll('.campaign-card').forEach(el => {
      el.classList.toggle('active', el.dataset.campaign === state.campaignId);
    });

    // Tier buttons
    const tierContainer = container.querySelector('#tier-buttons');
    tierContainer.innerHTML = '';
    Object.entries(camp.tiers).forEach(([key, tier]) => {
      const btn = document.createElement('button');
      btn.className = `tier-btn${state.tier === key ? ' active' : ''}`;
      btn.style.setProperty('--camp-color', camp.color);
      btn.innerHTML = `
        <div class="tier-btn-name">${tier.label}</div>
        <div class="tier-btn-budget">~${fmt$(tier.budget).replace('.00', '')}/mo budget</div>
        <div class="tier-btn-vol">${tier.volume.toLocaleString()} patients/mo</div>
      `;
      btn.addEventListener('click', () => {
        state.tier = key;
        state.customVolume = null;
        slider.value = tier.volume;
        render();
      });
      tierContainer.appendChild(btn);
    });

    // Sync slider
    const currentVol = getVolume();
    slider.value = currentVol;
    container.querySelector('#custom-vol-display').textContent = `${currentVol.toLocaleString()} patients/mo`;

    // Panel table
    const tbody = container.querySelector('#panel-tbody');
    tbody.innerHTML = '';
    const totalRate = perPatient;
    panel.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace;font-weight:600;color:var(--camp-color, var(--accent))">${row.code}</td>
        <td style="color:var(--text-secondary);font-size:12px">${row.label}</td>
        <td style="font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">
          ${row.available ? fmt$(row.rate) : '<span style="color:var(--text-muted);font-size:11px">Not separately priced</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
    // Total row
    const totalRow = document.createElement('tr');
    totalRow.style.borderTop = '2px solid var(--border)';
    totalRow.innerHTML = `
      <td colspan="2" style="font-weight:700;font-size:13px;padding-top:10px">Total Per Patient</td>
      <td style="font-weight:800;font-size:15px;color:var(--accent);font-variant-numeric:tabular-nums;padding-top:10px">${fmt$(totalRate)}</td>
    `;
    tbody.appendChild(totalRow);

    // Revenue summary
    container.querySelector('#rev-campaign-name').innerHTML = `${camp.icon} ${camp.name}`;
    container.querySelector('#rev-campaign-name').style.color = camp.color;
    container.querySelector('#rev-volume-label').textContent = `${currentVol.toLocaleString()} patients/month`;
    container.querySelector('#per-patient-val').textContent = fmt$(perPatient);
    container.querySelector('#monthly-val').textContent = fmt$(monthly);
    container.querySelector('#annual-val').textContent = fmt$(annual);
  }

  // ── Pitch text builder ───────────────────────────────────────────────────
  function buildPitchText() {
    const camp = CAMPAIGNS[state.campaignId];
    const panel = resolvePanel(camp);
    const perPatient = panel.reduce((sum, r) => sum + (r.rate ?? 0), 0);
    const volume = getVolume();
    const tierLabel = state.tier
      ? `${camp.tiers[state.tier].label} Tier (~${fmt$(camp.tiers[state.tier].budget).replace('.00', '')}/mo budget)`
      : `Custom Volume`;
    const monthly = perPatient * volume;
    const annual = monthly * 12;

    const lines = [
      `PRIME AD SOLUTIONS — LAB REIMBURSEMENT PROPOSAL`,
      `${'='.repeat(52)}`,
      ``,
      `Campaign Line : ${camp.icon} ${camp.name}`,
      `Lead Tier     : ${tierLabel}`,
      `Monthly Volume: ${volume.toLocaleString()} patients / month`,
      ``,
      `MEDICARE REIMBURSEMENT PROJECTIONS (CY2026 CLFS):`,
      `  Per-Patient Reimbursement  : ${fmt$(perPatient)}`,
      `  Estimated Monthly Revenue  : ${fmt$(monthly)} / mo`,
      `  Estimated Annual Revenue   : ${fmt$(annual)} / yr`,
      ``,
      `INCLUDED TEST PANEL:`,
      ...panel.map(r => `  • ${r.label} (${r.code}): ${r.available ? fmt$(r.rate) : 'Not separately reimbursed'}`),
      ``,
      `─`.repeat(52),
      `Rates sourced from CMS CY2026 Clinical Laboratory Fee Schedule (CLFS).`,
      `Projections are estimates. Actual reimbursement depends on payer mix,`,
      `patient eligibility, deductibles, and billing compliance.`,
      ``,
      `Generated by Prime AD Solutions Lab Revenue Estimator`,
      `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    ];
    return lines.join('\n');
  }

  // ── CSV export ───────────────────────────────────────────────────────────
  function exportProposalCSV() {
    const camp = CAMPAIGNS[state.campaignId];
    const panel = resolvePanel(camp);
    const perPatient = panel.reduce((sum, r) => sum + (r.rate ?? 0), 0);
    const volume = getVolume();
    const monthly = perPatient * volume;
    const annual = monthly * 12;

    const rows = [
      ['Prime AD Solutions — Lab Revenue Proposal'],
      ['Campaign', camp.name],
      ['Lead Volume (patients/mo)', volume],
      ['Per-Patient Medicare Reimbursement', perPatient.toFixed(2)],
      ['Estimated Monthly Revenue', monthly.toFixed(2)],
      ['Estimated Annual Revenue', annual.toFixed(2)],
      [],
      ['Test Panel Breakdown'],
      ['HCPCS Code', 'Test Name', 'Medicare Rate (CY2026)'],
      ...panel.map(r => [r.code, r.label, r.available ? r.rate.toFixed(2) : 'N/A']),
      [],
      ['Source: CMS CY2026 CLFS'],
      [`Date: ${new Date().toLocaleDateString()}`],
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primeAD_${camp.id}_lab_proposal.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Initial render ────────────────────────────────────────────────────────
  render();
}
