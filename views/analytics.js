/* global Chart */

/**
 * Analytics view — renders statistics strip, pie/donut chart, and top-20 bar chart.
 * Chart.js is loaded from CDN in index.html; we reference it via the global.
 *
 * @param {HTMLElement} container
 * @param {import('../types').CLFSRecord[]} records
 */
export function renderAnalytics(container, records) {
  // ── Compute stats ──────────────────────────────────────────
  const national   = records.filter(r => !r.is_locally_priced);
  const local      = records.filter(r => r.is_locally_priced);
  const adlt       = records.filter(r => r.is_adlt);
  const pamaCodes  = records.filter(r => r.in_pama_scope);
  const withRates  = national.filter(r => r.rate_2026 != null && r.rate_2026 > 0);
  const avgRate    = withRates.length
    ? withRates.reduce((s, r) => s + r.rate_2026, 0) / withRates.length
    : 0;
  const maxRate    = withRates.length
    ? Math.max(...withRates.map(r => r.rate_2026))
    : 0;

  // Top 20 by rate (nationally priced only)
  const top20 = [...withRates]
    .sort((a, b) => b.rate_2026 - a.rate_2026)
    .slice(0, 20);

  // ── HTML shell ────────────────────────────────────────────
  container.innerHTML = `
    <div class="view-header">
      <h1>Analytics</h1>
      <p>Summary statistics for CY2026 Clinical Laboratory Fee Schedule</p>
    </div>
    <div class="view-body">
      <div class="stats-strip">
        <div class="stat-card">
          <span class="stat-label">Total Codes</span>
          <span class="stat-value">${records.length.toLocaleString()}</span>
          <span class="stat-sub">unique HCPCS codes</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Nationally Priced</span>
          <span class="stat-value">${national.length.toLocaleString()}</span>
          <span class="stat-sub">${((national.length / records.length) * 100).toFixed(1)}% of total</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Locally Priced</span>
          <span class="stat-value">${local.length.toLocaleString()}</span>
          <span class="stat-sub">rate set by contractor</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Avg National Rate</span>
          <span class="stat-value">$${avgRate.toFixed(2)}</span>
          <span class="stat-sub">excl. $0 local codes</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Highest Rate</span>
          <span class="stat-value">$${maxRate.toFixed(2)}</span>
          <span class="stat-sub">${top20[0]?.hcpcs ?? ''} — ${top20[0]?.short_desc?.slice(0, 24) ?? ''}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">PAMA In-Scope</span>
          <span class="stat-value">${pamaCodes.length.toLocaleString()}</span>
          <span class="stat-sub">2025 data collection</span>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h2>Pricing Type Breakdown</h2>
          <div class="chart-container" style="height:280px">
            <canvas id="pie-chart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h2>Top 20 Codes by CY2026 Rate</h2>
          <div class="chart-container" style="height:${top20.length * 32 + 40}px">
            <canvas id="bar-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Chart.js colours ──────────────────────────────────────
  const isDark = document.documentElement.dataset.theme !== 'light';
  const textColor    = isDark ? '#8b949e' : '#656d76';
  const gridColor    = isDark ? '#21262d' : '#e8eaed';

  // ── Pie chart ─────────────────────────────────────────────
  const pieCtx = container.querySelector('#pie-chart').getContext('2d');
  new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Nationally Priced', 'Locally Priced', 'ADLT'],
      datasets: [{
        data: [
          national.length - adlt.length,
          local.length,
          adlt.length,
        ],
        backgroundColor: ['#00d4aa', '#bc8cff', '#ffa657'],
        borderColor: isDark ? '#161b22' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            padding: 14,
            font: { family: 'Inter', size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} codes`,
          },
        },
      },
    },
  });

  // ── Bar chart ─────────────────────────────────────────────
  const barCtx = container.querySelector('#bar-chart').getContext('2d');
  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: top20.map(r => `${r.hcpcs} — ${r.short_desc?.slice(0, 28) ?? ''}`),
      datasets: [{
        label: 'CY2026 Rate ($)',
        data: top20.map(r => r.rate_2026),
        backgroundColor: top20.map((_, i) =>
          `hsla(${166 - i * 4}, 80%, ${55 - i * 1}%, 0.85)`
        ),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` $${ctx.parsed.x.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Inter', size: 11 },
            callback: v => `$${v.toLocaleString()}`,
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { family: 'Inter', size: 11 },
          },
        },
      },
    },
  });
}
