/**
 * Code Detail View — Displays full 3-tier descriptions, rate info, PAMA scope details, and private payer notes.
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

  container.innerHTML = `
    <div class="view-header">
      <button class="detail-back" id="back-btn">← Back to Browse</button>
      <div style="display:flex; align-items:center; justify-content:space-between;">
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
          <div class="rate-label">CY2026 Payment Rate</div>
          <div class="rate-value">${rateDisplay}</div>
        </div>
      </div>

      <div class="detail-grid">
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
            <span class="dv">${isLocal ? 'Locally determined ($0.00)' : `$${(record.rate_2026 ?? 0).toFixed(2)}`}</span>
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

  container.querySelector('#back-btn').addEventListener('click', () => onBack());
}
