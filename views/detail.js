/**
 * Code Detail View — Displays full 3-tier descriptions, rate info, PAMA scope details, and single-code revenue calculator.
 *
 * @param {HTMLElement} container
 * @param {import('../types').CLFSRecord} record
 * @param {Function} onBack
 */
export function renderDetail(container, record, onBack) {
  if (!record) {
    onBack();
    return;
  }

  const isLocal = record.is_locally_priced;
  const rateDisplay = isLocal
    ? '<span class="rate-local">Locally Determined</span>'
    : `$${(record.rate_2026 ?? 0).toFixed(2)}`;

  const defaultVol = 100;
  const rateVal = record.rate_2026 ?? 0;
  const initialMonthly = rateVal * defaultVol;
  const initialAnnual = initialMonthly * 12;

  container.innerHTML = `
    <div class="view-header">
      <button class="detail-back" id="back-btn">← Back to Browse</button>
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <h1>Code Details: ${record.hcpcs}</h1>
        <span class="badge ${isLocal ? 'badge-purple' : 'badge-green'}" style="font-size:12px; padding:4px 10px;">
          ${isLocal ? 'Local Contractor Pricing' : 'National Fee Schedule'}
        </span>
      </div>
    </div>
    <div class="view-body">
      <div class="detail-hcpcs-hero">
        <div>
          <div class="hero-code">${record.hcpcs}</div>
          <div class="hero-short-desc">${record.short_desc || 'No description available'}</div>
          <div class="hero-badges">
            ${record.in_pama_scope ? '<span class="badge badge-green">PAMA In-Scope</span>' : '<span class="badge badge-muted">Not in PAMA Scope</span>'}
            ${record.has_qw_variant ? '<span class="badge badge-blue">CLIA Waived (QW)</span>' : ''}
            ${record.is_adlt ? '<span class="badge badge-orange">ADLT</span>' : ''}
            ${isLocal ? '<span class="badge badge-purple">Locally Priced</span>' : '<span class="badge badge-green">Nationally Priced</span>'}
          </div>
        </div>
        <div class="hero-rate">
          <div class="rate-label">Medicare Reimbursement Rate</div>
          <div class="rate-value">${rateDisplay}</div>
        </div>
      </div>

      <div class="detail-grid">
        ${!isLocal && rateVal > 0 ? `
        <!-- Single-Code Revenue Calculator -->
        <div class="detail-card full-width" style="background:var(--bg-surface); border:2px solid var(--accent); position:relative;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <h3 style="margin:0; color:var(--accent); display:flex; align-items:center; gap:8px;">
              <span>💰</span> Single-Test Revenue Calculator
            </h3>
            <span class="badge badge-green">CY2026 Rate: $${rateVal.toFixed(2)}</span>
          </div>
          <p style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">
            Estimate projected Medicare revenue for <strong>HCPCS ${record.hcpcs}</strong> based on expected monthly test volume.
          </p>

          <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px; flex-wrap:wrap;">
            <label style="font-size:13px; font-weight:600; color:var(--text-primary);" for="detail-vol-input">
              Monthly Test Volume:
            </label>
            <input type="number" id="detail-vol-input" min="1" max="100000" value="${defaultVol}"
              style="width:110px; padding:8px 12px; border-radius:6px; border:2px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-family:inherit; font-size:15px; font-weight:700;" />
            <span style="font-size:12px; color:var(--text-muted);">tests / month</span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
            <div style="background:var(--bg-elevated); padding:14px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:4px;">Medicare Pays (Per Test)</div>
              <div style="font-size:20px; font-weight:800; color:var(--text-primary); font-variant-numeric:tabular-nums;">$${rateVal.toFixed(2)}</div>
            </div>
            <div style="background:var(--accent-dim); padding:14px; border-radius:8px; border:1px solid var(--accent);">
              <div style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:4px;">Est. Monthly Revenue</div>
              <div id="detail-monthly-out" style="font-size:22px; font-weight:800; color:var(--accent); font-variant-numeric:tabular-nums;">
                $${initialMonthly.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
              </div>
            </div>
            <div style="background:var(--bg-elevated); padding:14px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:4px;">Est. Annual Revenue</div>
              <div id="detail-annual-out" style="font-size:20px; font-weight:800; color:var(--text-primary); font-variant-numeric:tabular-nums;">
                $${initialAnnual.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Descriptions Card -->
        <div class="detail-card full-width">
          <h3>HCPCS Code Descriptions</h3>
          <div class="desc-block">
            <strong>Short Description</strong>
            <p>${record.short_desc || '—'}</p>
          </div>
          <div class="desc-block">
            <strong>Long Description</strong>
            <p>${record.long_desc || '—'}</p>
          </div>
          <div class="desc-block">
            <strong>Extended Long Description</strong>
            <p>${record.extended_desc || '—'}</p>
          </div>
        </div>

        <!-- Payment & Administrative Info Card -->
        <div class="detail-card">
          <h3>Payment & Administrative Info</h3>
          <div class="detail-row">
            <span class="dl">HCPCS Code</span>
            <span class="dv">${record.hcpcs}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Fee Schedule Year</span>
            <span class="dv">${record.year || '2026'}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Effective Date</span>
            <span class="dv">${record.eff_date || '2026-01-01'}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Modifier</span>
            <span class="dv">${record.modifier ? record.modifier : (record.has_qw_variant ? 'QW available' : 'None')}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Pricing Indicator</span>
            <span class="dv">${record.indicator} (${isLocal ? 'Local Coverage' : 'National Price'})</span>
          </div>
          <div class="detail-row">
            <span class="dl">CY2026 Rate</span>
            <span class="dv">${isLocal ? 'Locally determined ($0.00)' : `$${rateVal.toFixed(2)}`}</span>
          </div>
        </div>

        <!-- PAMA & Private Payer Status Card -->
        <div class="detail-card">
          <h3>PAMA & Reporting Status</h3>
          <div class="detail-row">
            <span class="dl">PAMA Reporting Scope</span>
            <span class="dv">${record.in_pama_scope ? 'Included (Jan 1–Jun 30, 2025 Period)' : 'Not Included'}</span>
          </div>
          <div class="detail-row">
            <span class="dl">ADLT Status</span>
            <span class="dv">${record.is_adlt ? 'Yes (Advanced Diagnostic Lab Test)' : 'Standard Test'}</span>
          </div>
          <div class="detail-row">
            <span class="dl">CLIA Waived Variant</span>
            <span class="dv">${record.has_qw_variant ? 'Yes (QW modifier)' : 'No'}</span>
          </div>
          
          <div class="payer-callout">
            <strong>ℹ️ PAMA Rebasing Note</strong><br/>
            Section 6226 of CAA 2026 specifies that private payer data collection (Jan 1–Jun 30, 2025) and reporting (May 1–Jul 31, 2026) will determine future rate updates. 2025 collection results are currently pending publication by CMS.
          </div>
        </div>
      </div>
    </div>
  `;

  // Back button
  container.querySelector('#back-btn').addEventListener('click', () => onBack());

  // Interactive volume input for single-code calc
  const volInput = container.querySelector('#detail-vol-input');
  if (volInput && rateVal > 0) {
    volInput.addEventListener('input', () => {
      const vol = Math.max(1, parseInt(volInput.value, 10) || 0);
      const m = rateVal * vol;
      const a = m * 12;
      const mEl = container.querySelector('#detail-monthly-out');
      const aEl = container.querySelector('#detail-annual-out');
      if (mEl) mEl.textContent = `$${m.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
      if (aEl) aEl.textContent = `$${a.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    });
  }
}
